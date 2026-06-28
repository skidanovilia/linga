// A live review session. Session assembly (via the strategy's buildSession) and
// the same-session requeue of wrong answers both live here, so callers only
// render the current item and report correct/wrong. State is applied to the
// local copy immediately for responsiveness, then upserted (last-write-wins).

import type { ProgressStore } from './store'
import type { ProgressState, ReviewItem, ReviewStrategy, SessionCounts } from './types'

export interface ReviewSessionOptions {
  /** Clock injector — `() => new Date()` in the app, a fixed stub in tests. */
  now: () => Date
  /** Steps to wait before re-inserting a wrong item (once). */
  requeueGap: number
}

export interface ReviewSessionSummary {
  answered: number
  correct: number
  total: number
}

export interface ReviewSession<T> {
  /** The item to show now, or `null` when the session is complete. */
  current(): ReviewItem<T> | null
  /** The item after the current one (for a background/preview card), or `null`. */
  peek(): ReviewItem<T> | null
  /** Number remaining in the queue from the current position. */
  remaining(): number
  /** Grade the current item: update local state, persist, maybe requeue. */
  answer(correct: boolean): Promise<void>
  /** Advance to the next item. */
  next(): void
  isComplete(): boolean
  summary(): ReviewSessionSummary
  /** Earliest future due time of items left out of this session, or `null`. */
  nextDueAt: Date | null
  counts: SessionCounts
}

export function createReviewSession<T>(
  items: ReviewItem<T>[],
  store: ProgressStore,
  strategy: ReviewStrategy,
  opts: ReviewSessionOptions,
): ReviewSession<T> {
  const byId = new Map(items.map((i) => [i.id, i]))
  const local = new Map<string, ProgressState | null>(items.map((i) => [i.id, i.state]))

  const plan = strategy.buildSession(items, { now: opts.now() })
  const queue = [...plan.queue]
  const requeued = new Set<string>()

  let position = 0
  let answered = 0
  let correctCount = 0

  const current = (): ReviewItem<T> | null => {
    const id = queue[position]
    return id ? (byId.get(id) ?? null) : null
  }

  const peek = (): ReviewItem<T> | null => {
    const id = queue[position + 1]
    return id ? (byId.get(id) ?? null) : null
  }

  const answer = async (correct: boolean): Promise<void> => {
    const id = queue[position]
    if (!id) return

    const now = opts.now()
    const next = strategy.grade(local.get(id) ?? null, correct, now)
    local.set(id, next) // optimistic: reflect the new box immediately
    answered += 1
    if (correct) correctCount += 1

    // Re-insert a wrong item once, a few steps further along — not immediately.
    if (!correct && !requeued.has(id)) {
      const insertAt = Math.min(queue.length, position + opts.requeueGap + 1)
      queue.splice(insertAt, 0, id)
      requeued.add(id)
    }

    try {
      await store.upsertProgress(id, next)
    } catch (err) {
      // Local state already moved; a single-user account tolerates a lost write
      // (last-write-wins). Surface it without breaking the run.
      console.error('Failed to persist review progress', err)
    }
  }

  const next = (): void => {
    position += 1
  }

  const isComplete = (): boolean => position >= queue.length

  return {
    current,
    peek,
    remaining: () => Math.max(0, queue.length - position),
    answer,
    next,
    isComplete,
    summary: () => ({ answered, correct: correctCount, total: queue.length }),
    nextDueAt: plan.nextDueAt,
    counts: plan.counts,
  }
}
