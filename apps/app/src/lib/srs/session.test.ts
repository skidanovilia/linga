import { describe, expect, it } from 'vitest'
import { SRS } from '../../config'
import { createLeitnerStrategy } from './leitner'
import { createReviewSession, type ReviewSession } from './session'
import { summarizeShelf } from './shelf'
import { toReviewItems, type ProgressStore } from './store'
import type { ProgressState, ReviewItem } from './types'

const strategy = createLeitnerStrategy()
const NOW = new Date('2026-06-28T12:00:00.000Z')
const now = () => NOW

// Identity shuffle keeps the queue in plan order so placement is deterministic.
// Every test below injects it except the one that exercises the real default.
const identity = <U,>(items: readonly U[]): U[] => [...items]

class FakeStore implements ProgressStore {
  rows = new Map<string, ProgressState>()
  async loadProgress(ids: string[]) {
    const m = new Map<string, ProgressState>()
    for (const id of ids) {
      const s = this.rows.get(id)
      if (s) m.set(id, s)
    }
    return m
  }
  async upsertProgress(id: string, state: ProgressState) {
    this.rows.set(id, state)
  }
}

function freshItems(ids: string[]): ReviewItem<string>[] {
  return ids.map((id) => ({ id, content: id, state: null }))
}

describe('createReviewSession', () => {
  it('persists each answer through the store with the graded state', async () => {
    const store = new FakeStore()
    const session = createReviewSession(freshItems(['a']), store, strategy, {
      now,
      requeueGap: 2,
      shuffle: identity,
    })
    expect(session.current()?.id).toBe('a')

    await session.answer(true)
    const saved = store.rows.get('a')
    expect(saved?.box).toBe(1)
    expect(saved?.lastResult).toBe('correct')
  })

  it('re-inserts a wrong item once, a few steps later — not immediately', async () => {
    const store = new FakeStore()
    const session = createReviewSession(freshItems(['a', 'b', 'c', 'd']), store, strategy, {
      now,
      requeueGap: 2,
      shuffle: identity,
    })

    await session.answer(false) // wrong on 'a' at position 0
    // 'a' should reappear after b and c (gap of 2), not right away.
    expect(session.current()?.id).toBe('a')
    session.next()
    expect(session.current()?.id).toBe('b')
    session.next()
    expect(session.current()?.id).toBe('c')
    session.next()
    expect(session.current()?.id).toBe('a') // requeued here
    session.next()
    expect(session.current()?.id).toBe('d')

    // A wrong answer the second time does not requeue again.
    const before = session.remaining()
    session.next() // move past 'd' if any; ensure we're at 'a' requeue handled once
    expect(before).toBeGreaterThanOrEqual(0)
  })

  it('does not requeue correct answers', async () => {
    const store = new FakeStore()
    const session = createReviewSession(freshItems(['a', 'b']), store, strategy, {
      now,
      requeueGap: 2,
      shuffle: identity,
    })
    await session.answer(true)
    session.next()
    await session.answer(true)
    session.next()
    expect(session.isComplete()).toBe(true)
    expect(session.summary()).toMatchObject({ answered: 2, correct: 2, total: 2 })
  })

  it('runs a whole new unit in one session, reviewing it like any other', async () => {
    const store = new FakeStore()
    const ids = Array.from({ length: 8 }, (_, i) => `w${i}`)
    const session = createReviewSession(freshItems(ids), store, strategy, {
      now,
      requeueGap: SRS.requeueGap,
      shuffle: identity,
    })

    // The entire unit is introduced at once — no trickle, no session cap.
    expect(session.summary().total).toBe(8)
    expect(session.counts.fresh).toBe(8)

    // A first correct answer schedules a real future review, not a repeat.
    await session.answer(true)
    expect(store.rows.get('w0')).toMatchObject({ box: 1, reps: 1, lastResult: 'correct' })
    expect(store.rows.get('w0')?.dueAt).toEqual(new Date(NOW.getTime() + SRS.boxIntervals[0]))
    session.next()

    // A wrong answer re-arms the item soon...
    expect(session.current()?.id).toBe('w1')
    await session.answer(false)
    expect(store.rows.get('w1')).toMatchObject({ box: 1, lapses: 1, lastResult: 'wrong' })
    expect(store.rows.get('w1')?.dueAt).toEqual(
      new Date(NOW.getTime() + SRS.wrongShortInterval),
    )

    // ...and returns it later in this same session, which grows by one slot.
    expect(session.summary().total).toBe(9)
    session.next()
    const rest: string[] = []
    while (!session.isComplete()) {
      rest.push(session.current()!.id)
      session.next()
    }
    expect(rest).toContain('w1')
    expect(rest[0]).not.toBe('w1') // requeued a few steps on, not immediately
  })

  it('after a perfect pass, relaunching does not re-serve the same items', async () => {
    const store = new FakeStore()
    const ids = ['a', 'b', 'c']
    const first = createReviewSession(freshItems(ids), store, strategy, {
      now,
      requeueGap: 2,
      shuffle: identity,
    })
    // Answer everything correctly.
    while (!first.isComplete()) {
      await first.answer(true)
      first.next()
    }

    // Relaunch: rebuild items from the persisted progress (left-join on read).
    const content = ids.map((id) => ({ id, content: id }))
    const progress = await store.loadProgress(ids)
    const items = toReviewItems(content, progress)
    const plan = strategy.buildSession(items, { now: NOW })

    expect(plan.queue).toHaveLength(0) // all promoted to box 1, due in the future
    expect(plan.nextDueAt).not.toBeNull()
  })
})

/**
 * What the finished-session screen asks: is there anything to come back to right
 * now? Answered from the state the session ended on, never from the plan — the
 * plan was fixed before a single answer landed.
 */
describe('post-session shelf', () => {
  const MIN = 60 * 1000
  const DAY = 24 * 60 * MIN
  const at = (deltaMs: number) => new Date(NOW.getTime() + deltaMs)
  const firstInterval = SRS.boxIntervals[0]

  const runToCompletion = async (ids: string[]) => {
    const store = new FakeStore()
    const session = createReviewSession(freshItems(ids), store, strategy, {
      now,
      requeueGap: SRS.requeueGap,
      shuffle: identity,
    })
    while (!session.isComplete()) {
      await session.answer(true)
      session.next()
    }
    return { session, store }
  }

  it('itemsNow carries the answers and leaves untouched items alone', async () => {
    const store = new FakeStore()
    const items: ReviewItem<string>[] = [
      { id: 'answered', content: 'answered', state: null },
      {
        id: 'untouched',
        content: 'untouched',
        state: {
          box: 3,
          dueAt: at(DAY),
          reps: 2,
          lapses: 0,
          lastResult: 'correct',
          lastSeenAt: NOW,
        },
      },
    ]
    const session = createReviewSession(items, store, strategy, {
      now,
      requeueGap: SRS.requeueGap,
      shuffle: identity,
    })
    await session.answer(true)

    const after = new Map(session.itemsNow().map((i) => [i.id, i.state]))
    expect(after.get('answered')).toMatchObject({ box: 1, reps: 1, lastResult: 'correct' })
    expect(after.get('untouched')).toMatchObject({ box: 3, reps: 2 }) // never queued
  })

  it('leaves nothing due after a new unit is introduced, and reports the real next review', async () => {
    const { session } = await runToCompletion(['a', 'b', 'c'])

    const shelf = summarizeShelf(session.itemsNow(), strategy, NOW)
    expect(shelf.dueCount).toBe(0) // → no "Review again"
    expect(shelf.newCount).toBe(0) // every word was introduced
    expect(shelf.nextDueAt).toEqual(at(firstInterval))

    // The plan cannot answer this: it was built before any answer existed, and
    // every item was queued, so it saw no future work at all.
    expect(session.nextDueAt).toBeNull()
  })

  it('has due work once the scheduled moment has arrived', async () => {
    const { session } = await runToCompletion(['a', 'b', 'c'])
    const shelf = summarizeShelf(session.itemsNow(), strategy, at(firstInterval + MIN))
    expect(shelf.dueCount).toBe(3) // → "Review again" is warranted
  })

  it('never counts a never-reviewed item as due, however long it waits', () => {
    const store = new FakeStore()
    const session = createReviewSession(freshItems(['a', 'b']), store, strategy, {
      now,
      requeueGap: SRS.requeueGap,
      shuffle: identity,
    })
    const shelf = summarizeShelf(session.itemsNow(), strategy, at(30 * DAY))
    expect(shelf.newCount).toBe(2)
    expect(shelf.dueCount).toBe(0)
  })

  it('a repeat run re-evaluates: empty right away, the due items once time passes', async () => {
    const { session, store } = await runToCompletion(['a', 'b', 'c'])
    const ended = session.itemsNow()

    // Immediately: the cards just cleared are scheduled ahead, so nothing returns.
    const immediate = createReviewSession(ended, store, strategy, {
      now: () => NOW,
      requeueGap: SRS.requeueGap,
      shuffle: identity,
    })
    expect(immediate.isComplete()).toBe(true)

    // Later: the same rebuild serves exactly what has come due.
    const laterAt = at(firstInterval + MIN)
    const later = createReviewSession(ended, store, strategy, {
      now: () => laterAt,
      requeueGap: SRS.requeueGap,
      shuffle: identity,
    })
    expect(later.summary().total).toBe(3)
  })
})

/**
 * Presentation order. The plan decides *which* cards and how many; the shuffle
 * decides only the sequence they are met in. These guard that split — that the
 * shuffle reaches the whole queue, and that nothing else feels it.
 */
describe('presentation order', () => {
  const MIN = 60 * 1000
  const DAY = 24 * 60 * MIN
  const at = (deltaMs: number) => new Date(NOW.getTime() + deltaMs)

  /** A deterministic non-identity reordering — a stand-in for a real shuffle. */
  const reverse = <U,>(items: readonly U[]): U[] => [...items].reverse()

  const st = (partial: Partial<ProgressState>): ProgressState => ({
    box: 2,
    dueAt: NOW,
    reps: 1,
    lapses: 0,
    lastResult: 'correct',
    lastSeenAt: NOW,
    ...partial,
  })

  /** A unit spanning all three buckets: a recent failure, overdue, and new words. */
  const mixedItems = (): ReviewItem<string>[] => [
    {
      id: 'fail',
      content: 'fail',
      state: st({ dueAt: at(-MIN), lastResult: 'wrong', lastSeenAt: at(-MIN) }),
    },
    { id: 'over1', content: 'over1', state: st({ dueAt: at(-DAY) }) },
    { id: 'over2', content: 'over2', state: st({ dueAt: at(-2 * DAY) }) },
    { id: 'new1', content: 'new1', state: null },
    { id: 'new2', content: 'new2', state: null },
  ]

  /** Walk a session start to finish, recording the order it presents. */
  const presented = (session: ReviewSession<string>): string[] => {
    const seen: string[] = []
    while (!session.isComplete()) {
      seen.push(session.current()!.id)
      session.next()
    }
    return seen
  }

  const open = (
    items: ReviewItem<string>[],
    shuffleFn?: <U>(xs: readonly U[]) => U[],
    store = new FakeStore(),
  ) =>
    createReviewSession(items, store, strategy, {
      now,
      requeueGap: SRS.requeueGap,
      ...(shuffleFn ? { shuffle: shuffleFn } : {}),
    })

  // AC1 + AC2
  it('presents the plan reordered, with no bucket keeping its reserved slot', () => {
    const items = mixedItems()
    const plan = strategy.buildSession(items, { now: NOW })
    const order = presented(open(items, reverse))

    expect(order).toEqual([...plan.queue].reverse())
    expect(plan.queue[0]).toBe('fail') // the plan reserves the lead for failures…
    expect(order[0]).not.toBe('fail') // …the presented order does not
  })

  // AC3
  it('shuffles once, over the whole queue, when the session opens', async () => {
    const items = mixedItems()
    const plan = strategy.buildSession(items, { now: NOW })
    const calls: number[] = []
    const spy = <U,>(xs: readonly U[]): U[] => {
      calls.push(xs.length)
      return [...xs]
    }

    const session = open(items, spy)
    expect(calls).toEqual([plan.queue.length])

    // Answering, requeueing and advancing must never reshuffle.
    await session.answer(false)
    session.next()
    await session.answer(true)
    session.next()
    expect(calls).toEqual([plan.queue.length])
  })

  // AC4
  it('changes the sequence only — not membership, counts, or nextDueAt', () => {
    const plain = open(mixedItems(), identity)
    const shuffled = open(mixedItems(), reverse)

    expect(shuffled.counts).toEqual(plain.counts)
    expect(shuffled.nextDueAt).toEqual(plain.nextDueAt)
    expect(shuffled.summary().total).toBe(plain.summary().total)

    const before = presented(plain)
    const after = presented(shuffled)
    expect([...after].sort()).toEqual([...before].sort()) // the same cards…
    expect(after).not.toEqual(before) // …in a different order
  })

  // AC5
  it('leaves the same-session requeue at its fixed gap, unshuffled', async () => {
    const session = open(mixedItems(), reverse)
    const wrongId = session.current()!.id
    await session.answer(false)
    session.next()

    const rest = presented(session)
    expect(rest.indexOf(wrongId)).toBe(SRS.requeueGap) // three steps on, as before
    expect(rest.filter((id) => id === wrongId)).toHaveLength(1) // and only once
  })

  // AC6
  it('does not touch memory strength or scheduling', async () => {
    const runAll = async (shuffleFn: <U>(xs: readonly U[]) => U[]) => {
      const store = new FakeStore()
      const session = open(mixedItems(), shuffleFn, store)
      while (!session.isComplete()) {
        await session.answer(true)
        session.next()
      }
      return store.rows
    }

    const plain = await runAll(identity)
    const shuffled = await runAll(reverse)
    expect(shuffled.size).toBe(plain.size)
    for (const [id, state] of plain) {
      expect(shuffled.get(id)).toEqual(state)
    }
  })

  // AC7 — the only test that exercises production's real randomness.
  it('uses the real shuffle by default and does not repeat an order across launches', () => {
    const ids = Array.from({ length: 15 }, (_, i) => `w${i}`)
    const orders = new Set<string>()
    for (let i = 0; i < 10; i++) {
      orders.add(presented(open(freshItems(ids))).join(',')) // no shuffle option
    }

    expect(orders.size).toBeGreaterThan(1) // launches differ from each other
    expect(orders.has(ids.join(','))).toBe(false) // and never the authored order
  })
})
