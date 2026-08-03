// Launch-button state, derived (not tracked). The same engine predicates that
// build a session also answer "should this shelf's start button be enabled?",
// so the UI and scheduler can never disagree.

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
  /** Earliest upcoming due time, or `null` if nothing is scheduled ahead. */
  nextDueAt: Date | null
  /**
   * A shelf is launchable iff something is due OR a new item remains. "Nothing
   * to repeat" alone does not disable it — only nothing-due *and* nothing-new.
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

  for (const item of items) {
    if (strategy.isNew(item.state)) {
      newCount += 1
    } else if (strategy.isDue(item.state, now)) {
      dueCount += 1
    } else if (item.state) {
      // Has a row but not due yet — a candidate for "next due at T".
      if (nextDueAt === null || item.state.dueAt < nextDueAt) {
        nextDueAt = item.state.dueAt
      }
    }
  }

  return {
    total: items.length,
    dueCount,
    newCount,
    nextDueAt,
    enabled: dueCount > 0 || newCount > 0,
  }
}
