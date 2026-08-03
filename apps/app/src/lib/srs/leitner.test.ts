import { describe, expect, it } from 'vitest'
import { createLeitnerStrategy, type LeitnerConfig } from './leitner'
import { summarizeShelf } from './shelf'
import type { ProgressState, ReviewItem } from './types'

const MIN = 60 * 1000
const DAY = 24 * 60 * MIN

const CONFIG: LeitnerConfig = {
  boxIntervals: [10 * MIN, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY],
  maxBox: 5,
  wrongShortInterval: 1 * MIN,
  failureCap: 5,
}

const strategy = createLeitnerStrategy(CONFIG)
const NOW = new Date('2026-06-28T12:00:00.000Z')
const at = (deltaMs: number) => new Date(NOW.getTime() + deltaMs)

function st(partial: Partial<ProgressState>): ProgressState {
  return {
    box: 1,
    dueAt: NOW,
    reps: 0,
    lapses: 0,
    lastResult: null,
    lastSeenAt: null,
    ...partial,
  }
}

function item(id: string, state: ProgressState | null = null): ReviewItem<string> {
  return { id, content: id, state }
}

describe('grade', () => {
  it('promotes a new item (null) to box 1 on first correct', () => {
    const next = strategy.grade(null, true, NOW)
    expect(next.box).toBe(1)
    expect(next.reps).toBe(1)
    expect(next.lapses).toBe(0)
    expect(next.lastResult).toBe('correct')
    expect(next.lastSeenAt).toEqual(NOW)
    expect(next.dueAt).toEqual(at(CONFIG.boxIntervals[0]))
  })

  it('promotes one box and widens the interval on correct', () => {
    const next = strategy.grade(st({ box: 2, reps: 3 }), true, NOW)
    expect(next.box).toBe(3)
    expect(next.reps).toBe(4)
    expect(next.dueAt).toEqual(at(CONFIG.boxIntervals[2]))
  })

  it('caps promotion at maxBox', () => {
    const next = strategy.grade(st({ box: 5 }), true, NOW)
    expect(next.box).toBe(5)
    expect(next.dueAt).toEqual(at(CONFIG.boxIntervals[4]))
  })

  it('drops to box 1, counts a lapse, and reschedules soon on wrong', () => {
    const next = strategy.grade(st({ box: 4, reps: 6, lapses: 1 }), false, NOW)
    expect(next.box).toBe(1)
    expect(next.reps).toBe(7)
    expect(next.lapses).toBe(2)
    expect(next.lastResult).toBe('wrong')
    expect(next.dueAt).toEqual(at(CONFIG.wrongShortInterval))
  })
})

describe('isNew / isDue', () => {
  it('treats a null state as new and never due', () => {
    expect(strategy.isNew(null)).toBe(true)
    expect(strategy.isDue(null, NOW)).toBe(false)
  })

  it('is due when box ≥ 1 and due_at ≤ now', () => {
    expect(strategy.isDue(st({ dueAt: at(-MIN) }), NOW)).toBe(true)
    expect(strategy.isDue(st({ dueAt: at(MIN) }), NOW)).toBe(false)
    expect(strategy.isNew(st({})).valueOf()).toBe(false)
  })
})

describe('buildSession', () => {
  it('leads with recent failures, most-recent first', () => {
    const items = [
      item('overdue', st({ dueAt: at(-DAY), lastResult: 'correct' })),
      item('failA', st({ dueAt: at(-MIN), lastResult: 'wrong', lastSeenAt: at(-2 * MIN) })),
      item('failB', st({ dueAt: at(-MIN), lastResult: 'wrong', lastSeenAt: at(-MIN) })),
    ]
    const plan = strategy.buildSession(items, { now: NOW })
    expect(plan.queue.slice(0, 2)).toEqual(['failB', 'failA']) // failB seen more recently
    expect(plan.queue).toContain('overdue')
    expect(plan.counts).toMatchObject({ failures: 2, overdue: 1 })
  })

  it('introduces every new item of an untouched unit in one session', () => {
    // 30 is deliberately larger than any cap the engine used to apply.
    const items = Array.from({ length: 30 }, (_, i) => item(`new${i}`))
    const plan = strategy.buildSession(items, { now: NOW })
    expect(plan.queue).toHaveLength(30)
    expect(plan.queue).toEqual(items.map((i) => i.id)) // content order preserved
    expect(plan.counts.fresh).toBe(30)
    expect(plan.nextDueAt).toBeNull()
  })

  it('queues all new items alongside due work, however many there are', () => {
    const items = [
      item('due', st({ dueAt: at(-MIN), lastResult: 'correct' })),
      ...Array.from({ length: 25 }, (_, i) => item(`new${i}`)),
    ]
    const plan = strategy.buildSession(items, { now: NOW })
    expect(plan.queue).toHaveLength(26)
    expect(plan.counts).toMatchObject({ overdue: 1, fresh: 25 })
  })

  it('orders most-overdue first', () => {
    const items = [
      item('mild', st({ dueAt: at(-MIN), lastResult: 'correct' })),
      item('severe', st({ dueAt: at(-DAY), lastResult: 'correct' })),
    ]
    const plan = strategy.buildSession(items, { now: NOW })
    expect(plan.queue).toEqual(['severe', 'mild'])
  })

  it('never pulls future items forward, and reports the nearest as nextDueAt', () => {
    const items = [
      item('due1', st({ dueAt: at(-MIN), lastResult: 'correct' })),
      item('f1', st({ box: 2, dueAt: at(DAY), lastResult: 'correct' })),
      item('f2', st({ box: 2, dueAt: at(2 * DAY), lastResult: 'correct' })),
      item('f3', st({ box: 2, dueAt: at(3 * DAY), lastResult: 'correct' })),
    ]
    const plan = strategy.buildSession(items, { now: NOW })
    expect(plan.queue).toEqual(['due1']) // a thin session stays thin
    expect(plan.nextDueAt).toEqual(at(DAY)) // f1, the nearest one left out
  })

  it('returns an empty queue with a nextDueAt when nothing is due or new', () => {
    const items = [
      item('a', st({ box: 3, dueAt: at(DAY), lastResult: 'correct' })),
      item('b', st({ box: 3, dueAt: at(3 * DAY), lastResult: 'correct' })),
    ]
    const plan = strategy.buildSession(items, { now: NOW })
    expect(plan.queue).toHaveLength(0)
    expect(plan.nextDueAt).toEqual(at(DAY))
  })

  it('interleaves new items into reviews rather than trailing them', () => {
    const items = [
      item('r1', st({ dueAt: at(-4 * MIN), lastResult: 'correct' })),
      item('r2', st({ dueAt: at(-3 * MIN), lastResult: 'correct' })),
      item('r3', st({ dueAt: at(-2 * MIN), lastResult: 'correct' })),
      item('r4', st({ dueAt: at(-MIN), lastResult: 'correct' })),
      item('n1'),
      item('n2'),
    ]
    const plan = strategy.buildSession(items, { now: NOW })
    // New cards are not both at the very end.
    const tail = plan.queue.slice(-2)
    expect(tail).not.toEqual(['n1', 'n2'])
    expect(plan.queue).toHaveLength(6)
  })
})

describe('summarizeShelf', () => {
  it('enables on due or new, and is disabled only when neither exists', () => {
    const due = summarizeShelf([item('a', st({ dueAt: at(-MIN) }))], strategy, NOW)
    expect(due).toMatchObject({ dueCount: 1, enabled: true })

    const fresh = summarizeShelf([item('a')], strategy, NOW)
    expect(fresh).toMatchObject({ newCount: 1, enabled: true })

    const idle = summarizeShelf(
      [item('a', st({ box: 2, dueAt: at(DAY), lastResult: 'correct' }))],
      strategy,
      NOW,
    )
    expect(idle).toMatchObject({ dueCount: 0, newCount: 0, enabled: false })
    expect(idle.nextDueAt).toEqual(at(DAY))
  })

  it('reports a unit with no vocabulary as empty and disabled', () => {
    const none = summarizeShelf([], strategy, NOW)
    expect(none).toMatchObject({ total: 0, dueCount: 0, newCount: 0, enabled: false })
    expect(none.nextDueAt).toBeNull()
  })

  it('counts every item in total, however it is scheduled', () => {
    const items = [
      item('new'),
      item('due', st({ dueAt: at(-MIN), lastResult: 'correct' })),
      item('later', st({ box: 2, dueAt: at(DAY), lastResult: 'correct' })),
    ]
    expect(summarizeShelf(items, strategy, NOW).total).toBe(3)
  })

  it('keeps a shelf enabled when nothing is due but new items remain', () => {
    const items = [
      item('done', st({ box: 2, dueAt: at(DAY), lastResult: 'correct' })),
      item('new', null),
    ]
    expect(summarizeShelf(items, strategy, NOW).enabled).toBe(true)
  })
})
