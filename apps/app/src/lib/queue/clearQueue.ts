// The challenge engine: a pure, in-memory "clear-the-queue" session. A run is
// the module's challenges shuffled into a queue. A correct answer clears the
// item (it is never shown again this run); a wrong answer re-inserts it later in
// the run, so every item must eventually be answered correctly to clear. The run
// ends when the queue empties. Unlike the SRS engine there is no box, no due
// date, no persistence, and no RPC here — only shuffle and re-queue placement.
// On completion the *adapter* (not this engine) records module completion.

import { shuffle } from '../shuffle'

export interface ClearQueueItem<T> {
  id: string
  content: T
}

export interface ClearQueueSummary {
  answered: number
  correct: number
  total: number
}

export interface ClearQueueSession<T> {
  /** The item to show now, or `null` once the queue is empty. */
  current(): ClearQueueItem<T> | null
  /** The item after the current one (for a preview), or `null`. */
  peek(): ClearQueueItem<T> | null
  /** Distinct items still to clear (total − cleared). */
  remaining(): number
  /** Monotonic count of items shown, for keying the renderer per presentation. */
  step: number
  /** Record the current item: correct clears it, wrong defers a re-queue. */
  answer(correct: boolean): void
  /** Advance to the next item. */
  next(): void
  isComplete(): boolean
  summary(): ClearQueueSummary
}

export interface ClearQueueOptions {
  /** Steps to wait before re-inserting a wrong item (it lands this far ahead). */
  requeueGap: number
  /** Injectable for deterministic tests; defaults to Fisher–Yates. */
  shuffle?: <U>(items: readonly U[]) => U[]
}

export function createClearQueueSession<T>(
  items: ClearQueueItem<T>[],
  opts: ClearQueueOptions,
): ClearQueueSession<T> {
  const byId = new Map(items.map((i) => [i.id, i]))
  const total = items.length
  const shuffleFn = opts.shuffle ?? shuffle
  const queue = shuffleFn(items).map((i) => i.id)

  let position = 0
  let answered = 0
  let cleared = 0

  const current = (): ClearQueueItem<T> | null => {
    const id = queue[position]
    return id ? (byId.get(id) ?? null) : null
  }

  const peek = (): ClearQueueItem<T> | null => {
    const id = queue[position + 1]
    return id ? (byId.get(id) ?? null) : null
  }

  const answer = (correct: boolean): void => {
    const id = queue[position]
    if (!id) return

    answered += 1
    if (correct) {
      // Advancing past it clears it — it was never requeued, so it never returns.
      cleared += 1
    } else {
      // Re-insert later in the run (not immediately next). Repeats on every wrong
      // answer, so the item must eventually be cleared correctly.
      const insertAt = Math.min(queue.length, position + opts.requeueGap + 1)
      queue.splice(insertAt, 0, id)
    }
  }

  return {
    current,
    peek,
    remaining: () => total - cleared,
    get step() {
      return position
    },
    answer,
    next: () => {
      position += 1
    },
    isComplete: () => position >= queue.length,
    summary: () => ({ answered, correct: cleared, total }),
  }
}
