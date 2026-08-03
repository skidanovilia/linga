// A live review session. Session assembly (via the strategy's buildSession),
// the shuffle that decides presentation order, and the same-session requeue of
// wrong answers all live here, so callers only render the current item and
// report correct/wrong. State is applied to the local copy immediately for
// responsiveness, then upserted (last-write-wins).

import { shuffle } from '../shuffle'
import type { ProgressStore } from './store'
import type { ProgressState, ReviewItem, ReviewStrategy, SessionCounts } from './types'

export interface ReviewSessionOptions {
  /** Clock injector — `() => new Date()` in the app, a fixed stub in tests. */
  now: () => Date
  /** Steps to wait before re-inserting a wrong item (once). */
  requeueGap: number
  /** Injectable for deterministic tests; defaults to Fisher–Yates. */
  shuffle?: <U>(items: readonly U[]) => U[]
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
  /**
   * Every item carrying the state this session has arrived at — answers applied,
   * untouched items unchanged. This is what "is anything due now that this is
   * over?" must be asked of, and what a repeat run is rebuilt from: the plan's
   * `nextDueAt` was fixed before a single answer landed.
   */
  itemsNow(): ReviewItem<T>[]
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
  // Presentation order only. The plan already decided *which* cards and how
  // many, and its counts/nextDueAt are passed through untouched below — this
  // reorders what the learner sees and nothing else. Shuffling here, strictly
  // downstream of the plan and once per session, means no bucket keeps a
  // reserved slot and no two launches replay the same sequence.
  const queue = (opts.shuffle ?? shuffle)(plan.queue)
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

  const itemsNow = (): ReviewItem<T>[] =>
    items.map((i) => ({ ...i, state: local.get(i.id) ?? null }))

  return {
    current,
    peek,
    remaining: () => Math.max(0, queue.length - position),
    answer,
    next,
    isComplete,
    itemsNow,
    summary: () => ({ answered, correct: correctCount, total: queue.length }),
    nextDueAt: plan.nextDueAt,
    counts: plan.counts,
  }
}
