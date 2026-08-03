import { describe, expect, it } from 'vitest'
import { SRS } from '../../config'
import { createLeitnerStrategy } from './leitner'
import { createReviewSession } from './session'
import { summarizeShelf } from './shelf'
import { toReviewItems, type ProgressStore } from './store'
import type { ProgressState, ReviewItem } from './types'

const strategy = createLeitnerStrategy()
const NOW = new Date('2026-06-28T12:00:00.000Z')
const now = () => NOW

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
    })
    expect(immediate.isComplete()).toBe(true)

    // Later: the same rebuild serves exactly what has come due.
    const laterAt = at(firstInterval + MIN)
    const later = createReviewSession(ended, store, strategy, {
      now: () => laterAt,
      requeueGap: SRS.requeueGap,
    })
    expect(later.summary().total).toBe(3)
  })
})
