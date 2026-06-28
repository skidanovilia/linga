// App-wide tunables. Keep run sizes here rather than inline so a single edit
// changes how many items each practice run includes.

/**
 * How many items a single *free-practice* run includes. The unit's items are
 * shuffled and capped to these counts; a unit with fewer items simply uses all
 * it has. (Scheduled spaced-repetition reviews use `SRS` below, not this.)
 */
export const RUN_SIZE = {
  /** Challenges per challenge run. */
  challenges: 10,
  /** Vocabulary cards per memo run. */
  vocab: 10,
} as const

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
