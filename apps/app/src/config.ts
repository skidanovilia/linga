// App-wide tunables. Keep run sizes here rather than inline so a single edit
// changes how many items each practice run includes.

/**
 * How many items a single run includes. The unit's items are shuffled and
 * capped to these counts; a unit with fewer items simply uses all it has.
 */
export const RUN_SIZE = {
  /** Challenges per challenge run. */
  challenges: 10,
  /** Vocabulary cards per memo run. */
  vocab: 10,
} as const
