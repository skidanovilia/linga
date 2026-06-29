// App-wide tunables. Each engine's config lives here in one place: `SRS` for the
// memo-card spaced-repetition engine, `CHALLENGE` for the clear-the-queue
// challenge engine. One edit retunes a whole engine.

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

/**
 * Spaced-repetition cadence — the single place every scheduling knob lives, so
 * one edit retunes the whole engine. The Leitner strategy and both shelves
 * (cards, challenges) read from here; nothing about timing is hard-coded
 * elsewhere.
 */
export const SRS = {
  /** Hard cap on items queued per launch (failures + overdue + new + future). */
  sessionSize: 20,
  /**
   * The primary guard against review pile-up: at most this many brand-new items
   * (no progress row yet) are introduced per launch.
   */
  newPerSession: 5,
  /** Cap on the recent-failure slice that leads a session. */
  failureCap: 5,
  /**
   * The widening interval ladder, indexed by `box - 1` (box is 1-based, capped
   * at `maxBox`). A correct answer promotes one box and schedules `now +
   * boxIntervals[newBox - 1]`. Box 1 is the same-session step — it comes back
   * quickly; each step roughly triples.
   */
  boxIntervals: [10 * MINUTE, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY],
  /** Highest box; promotion saturates here. (Must match `boxIntervals.length`.) */
  maxBox: 5,
  /** A wrong answer drops to box 1 and reschedules this soon (a short due_at). */
  wrongShortInterval: 1 * MINUTE,
  /**
   * After a wrong answer the item is re-inserted once, this many steps further
   * along the same session (not immediately).
   */
  requeueGap: 3,
} as const

/**
 * The challenge ("clear-the-queue") engine's only knob: where a wrong answer
 * re-enters the queue. There is deliberately no due/interval/box config here —
 * challenges shuffle and re-queue, nothing more.
 */
export const CHALLENGE = {
  /** A wrong challenge is re-inserted this many steps further along the run. */
  requeueGap: 3,
} as const
