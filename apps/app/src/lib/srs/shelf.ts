// Launch-button state, derived (not tracked). The same engine predicates that
// build a session also answer "should this shelf's start button be enabled?",
// so the UI and scheduler can never disagree.
//
// Review is gated on the *lowest occupied box*: a shelf opens for review only
// once everything left to introduce has been introduced and every item sitting
// in that lowest box has come due. Higher boxes are ignored until the lowest one
// is cleared, and a single laggard on it keeps the shelf shut — the point is to
// finish the box you are weakest on before the schedule offers you anything
// else. This is deliberately stricter than "something is due": a shelf can hold
// due items and still be closed.

import type { ReviewItem, ReviewStrategy } from './types'

export interface ShelfStatus {
  /**
   * Items on the shelf at all. `0` means the unit has no vocabulary — a
   * different state from "you have reviewed everything", and the UI says so.
   */
  total: number
  /** Items due now (box ≥ 1, due_at ≤ now). */
  dueCount: number
  /** Items never introduced (no progress row) — available to start as new. */
  newCount: number
  /**
   * Earliest upcoming due time, or `null` if nothing is scheduled ahead. This is
   * the *first* item to ripen anywhere on the shelf, which is not when review
   * opens — see `availableAt`. Box 1 items due in 2 h and in 5 h alongside a box
   * 3 item due tomorrow give `nextDueAt` = 2 h and `availableAt` = 5 h.
   */
  nextDueAt: Date | null
  /** Lowest Leitner box (≥ 1) currently holding one of the shelf's items; `null` if none has a row. */
  lowestBox: number | null
  /**
   * When review opens: the *latest* due time among the lowest occupied box's
   * items — the gate needs the whole box due, so the last one to ripen decides.
   * `null` when the shelf has no introduced items or still has new ones (the
   * gate is not a wait then: it is waiting on the learner, not on the clock).
   */
  availableAt: Date | null
  /**
   * Review is enterable: nothing left to introduce, and the lowest occupied box
   * is *fully* due. Not "something is due" — one item of that box still ripening
   * keeps the whole shelf closed, however much higher-box work has come due.
   */
  enabled: boolean
}

export function summarizeShelf(
  items: ReviewItem[],
  strategy: ReviewStrategy,
  now: Date,
): ShelfStatus {
  let dueCount = 0
  let newCount = 0
  let nextDueAt: Date | null = null
  let lowestBox: number | null = null
  // Per occupied box, the *latest* moment one of its items ripens. Max, not min:
  // the gate wants the whole box available, so the slowest item speaks for it.
  // Collected for every box in the one pass because a lower box can turn up at
  // any point in the list — which box wins is only known once the loop is done.
  const boxReadyAt = new Map<number, Date>()

  for (const item of items) {
    const state = item.state

    if (strategy.isNew(state)) {
      newCount += 1
    } else if (strategy.isDue(state, now)) {
      dueCount += 1
    } else if (state) {
      // Has a row but not due yet — a candidate for "next due at T".
      if (nextDueAt === null || state.dueAt < nextDueAt) {
        nextDueAt = state.dueAt
      }
    }

    // Box occupancy. New items are excluded by construction: box 0 is the no-row
    // sentinel, and an introduction is not a box the gate can wait on.
    if (state && state.box >= 1) {
      if (lowestBox === null || state.box < lowestBox) lowestBox = state.box
      const readyAt = boxReadyAt.get(state.box)
      if (!readyAt || state.dueAt > readyAt) boxReadyAt.set(state.box, state.dueAt)
    }
  }

  // With a word still to introduce there is no moment to report: the shelf is an
  // introduction, and no amount of waiting turns it into a review.
  const availableAt =
    newCount > 0 || lowestBox === null ? null : (boxReadyAt.get(lowestBox) ?? null)

  return {
    total: items.length,
    dueCount,
    newCount,
    nextDueAt,
    lowestBox,
    availableAt,
    // `availableAt` already carries the box's *latest* due time, so this one
    // comparison asserts the entire lowest box is available — not merely one
    // item on it.
    enabled: items.length > 0 && newCount === 0 && availableAt !== null && availableAt <= now,
  }
}

/**
 * What a shelf offers right now, as one value:
 *  - `none` — no vocabulary at all; nothing to introduce, nothing to review.
 *  - `introduce` — words have never been met. Ungated and outranks review: the
 *    shelf must be fully introduced before the gate is even asked.
 *  - `review` — the gate is open; a scheduled session can be entered.
 *  - `waiting` — everything is introduced but the lowest occupied box is not yet
 *    fully due. Nothing to review *now*, whatever higher boxes hold.
 *
 * Both the unit card's entry and the review route branch on this, so the button
 * and the screen behind it can never disagree about which of the four a shelf is.
 */
export type ShelfEntry = 'none' | 'introduce' | 'review' | 'waiting'

export function shelfEntry(status: ShelfStatus): ShelfEntry {
  if (status.total === 0) return 'none'
  if (status.newCount > 0) return 'introduce'
  return status.enabled ? 'review' : 'waiting'
}
