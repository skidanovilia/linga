// Thin per-kind glue between the content model and the clear-the-queue engine,
// the challenge counterpart to `cardAdapter`. It only lists a module's
// challenges (keyed by their stable content UUID) and binds to the progress
// store. It holds no scheduling logic: the queue/shuffle/re-queue lives in the
// engine, answer-checking lives in the challenge registry/renderer, and the only
// persistence is recording a challenge as passed once it is cleared.

import type { Challenge, Unit } from '../../types/domain'
import {
  SupabaseChallengeProgressStore,
  type ChallengeProgressStore,
} from '../../lib/queue/challengeProgressStore'

export const challengeAdapter = {
  kind: 'challenges' as const,
  /** This module's challenges, each keyed by its UUID. Order is irrelevant — the
   *  engine shuffles into a queue. */
  loadItems: (unit: Unit): { id: string; content: Challenge }[] =>
    unit.challenges.map((c) => ({ id: c.id, content: c })),
  /** A per-user store bound to challenge_progress. */
  createStore: (userId: string): ChallengeProgressStore =>
    new SupabaseChallengeProgressStore(userId),
}
