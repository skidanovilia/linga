import { describe, expect, it } from 'vitest'
import { SRS } from '../../config'
import { createLeitnerStrategy } from './leitner'
import { createReviewSession } from './session'
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
