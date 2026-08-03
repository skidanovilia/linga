// Which Explore tab a unit belongs to, decided *only* by the memory state of its
// vocabulary. No completion badge, no challenge-run history, no "have you opened
// this" flag: a unit is New because it still holds words you have never met, Now
// because the scheduler wants words back today, Recently because nothing in it can
// be reviewed at this moment. The predicates read the same `ShelfStatus` the
// launch button reads, so a tab can never disagree with the card inside it.
//
// The three buckets are deliberately not a partition:
//  - Now and Recently are mutually exclusive (`dueCount > 0` vs `dueCount === 0`).
//  - New overlaps Recently for a unit whose vocabulary is entirely untouched —
//    everything is new, so nothing is due. That unit really is both.
//  - A unit with a due word *and* an uninitiated word is New only: finishing the
//    introduction outranks the repeat.
//  - A unit with no vocabulary at all falls out as Recently only.
//
// `null` means "not known yet": `useShelfStatus` returns null while a signed-in
// user's progress loads. An unknown shelf belongs to no tab, so cards never flash
// into New and then jump elsewhere a moment later.

import type { ShelfStatus } from './shelf'

/** The three slices of the one unit list the Explore page offers. */
export type UnitTab = 'new' | 'now' | 'recently'

/**
 * New — at least one word has no progress row yet. Outranks Now: a unit you have
 * not finished being introduced to reads as new even when some words are due.
 */
export function isNewUnit(shelf: ShelfStatus | null): boolean {
  return shelf != null && shelf.newCount > 0
}

/**
 * Now — review work is waiting *and* there is nothing left to introduce. A
 * brand-new word is not "available to review": it is an introduction, and it is
 * what makes the unit New instead.
 */
export function isNowUnit(shelf: ShelfStatus | null): boolean {
  return shelf != null && shelf.dueCount > 0 && shelf.newCount === 0
}

/**
 * Recently — nothing is available to review right now. Purely the negation of
 * "something is due": whether the unit also has new words, or a `nextDueAt`
 * scheduled ahead, is irrelevant, which is why an untouched unit lands here as
 * well as in New.
 */
export function isRecentlyUnit(shelf: ShelfStatus | null): boolean {
  return shelf != null && shelf.dueCount === 0
}

/**
 * The one question the page asks. Signed out there is no memory state at all: no
 * `vocab_progress` rows exist, so every unit is New. That is asserted here rather
 * than synthesised as a shelf — an "everything is new" shelf has `dueCount === 0`
 * and would therefore also mirror the entire unit list into Recently, burying the
 * sign-in prompt those tabs are supposed to show.
 */
export function unitInTab(
  tab: UnitTab,
  shelf: ShelfStatus | null,
  signedIn: boolean,
): boolean {
  if (!signedIn) return tab === 'new'
  if (tab === 'new') return isNewUnit(shelf)
  if (tab === 'now') return isNowUnit(shelf)
  return isRecentlyUnit(shelf)
}
