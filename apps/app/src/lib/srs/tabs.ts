// Which Explore tab a unit belongs to, decided *only* by the memory state of its
// vocabulary. No completion badge, no challenge-run history, no "have you opened
// this" flag: a unit is New because it still holds words you have never met, Now
// because the scheduler wants words back today, Recently because nothing in it can
// be reviewed at this moment. The predicates read the same `ShelfStatus` the
// launch button reads, so a tab can never disagree with the card inside it.
//
// The three buckets partition the units — a unit shown at all is shown in
// exactly one tab:
//  - New wins whenever a word has never been met. A unit with a due word *and*
//    an uninitiated one is New only: finishing the introduction outranks the
//    repeat.
//  - Now is review work with nothing left to introduce.
//  - Recently is the remainder — everything introduced, everything scheduled
//    ahead. It is defined as "neither New nor Now" rather than as its own test,
//    so the three can never overlap or leave a gap.
//  - A unit with no vocabulary is in no tab: it has nothing to introduce and
//    nothing to repeat, and calling it "recently reviewed" would be a lie.
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
 * Recently — reviewed and settled: every word has been introduced and every one
 * is scheduled ahead. Exactly "neither New nor Now", so an untouched unit reads
 * as New alone rather than as both. A unit with no vocabulary was never
 * reviewed and belongs to no tab at all, which is what `total` guards.
 */
export function isRecentlyUnit(shelf: ShelfStatus | null): boolean {
  return (
    shelf != null && shelf.total > 0 && shelf.newCount === 0 && shelf.dueCount === 0
  )
}

/**
 * The one question the page asks. Signed out there is no memory state at all —
 * no `vocab_progress` rows exist — so every unit is New, asserted here rather
 * than derived from a shelf nobody loaded. One consequence: a unit with no
 * vocabulary still shows under New to a signed-out visitor, where a signed-in
 * one sees it in no tab. Keeping it out would need `total`, and signed out
 * there is no shelf to read it from.
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
