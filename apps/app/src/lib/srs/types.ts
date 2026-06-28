// The spaced-repetition engine's vocabulary. Everything here is content-blind:
// an item is an `id` plus its Leitner `state`, and the scheduler never learns
// whether that id is a vocab card or a challenge. Exercise type affects
// rendering only — the adapters supply it, the engine ignores it.

/** Outcome of a single scheduled answer. */
export type Result = 'correct' | 'wrong'

/**
 * One item's Leitner memory, mirroring a progress row (minus the keys). The
 * *absence* of this (a `null` state) means a new item: box 0, due now, no row
 * yet. A row — and therefore a non-null state — appears only once answered.
 */
export interface ProgressState {
  /** Leitner box, 1…maxBox once a row exists (0 is the new/no-row sentinel). */
  box: number
  dueAt: Date
  reps: number
  lapses: number
  lastResult: Result | null
  lastSeenAt: Date | null
}

/** A schedulable item: stable id, its content payload, and its memory. */
export interface ReviewItem<T = unknown> {
  id: string
  content: T
  /** `null` = new (no progress row): treated as box 0, due now. */
  state: ProgressState | null
}

/** How many items each priority bucket contributed to a session. */
export interface SessionCounts {
  failures: number
  overdue: number
  fresh: number
  future: number
}

export interface SessionPlan {
  /**
   * Ordered item ids to play. The same id may not appear twice here — the
   * same-session requeue of a wrong answer happens live in the session
   * controller, not in this initial plan.
   */
  queue: string[]
  counts: SessionCounts
  /**
   * Earliest future due time among items left out of the queue, or `null` if
   * nothing is waiting. Drives the "all reviewed — next due at T" state.
   */
  nextDueAt: Date | null
}

export interface BuildSessionOptions {
  now: Date
}

/**
 * The one interface every scheduling algorithm hides behind. The Leitner
 * implementation is one strategy; swapping algorithms must not touch callers.
 */
export interface ReviewStrategy {
  /** A new item — no progress row yet. */
  isNew(state: ProgressState | null): boolean
  /** Has a row, box ≥ 1, and due_at ≤ now. */
  isDue(state: ProgressState | null, now: Date): boolean
  /** Pure state transition for one answer. Accepts `null` (a new item). */
  grade(state: ProgressState | null, correct: boolean, now: Date): ProgressState
  /** Pick and order one launch's items (failures → overdue → new → future). */
  buildSession(items: ReviewItem[], opts: BuildSessionOptions): SessionPlan
}
