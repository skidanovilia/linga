// Thin per-kind glue between the content model and the shared review engine.
// An adapter only: lists its kind's content items, exposes each one's stable
// content UUID as the id, and binds to that kind's progress table. It contains
// no scheduling logic — that lives once in `lib/srs`.

import type { Challenge, ChallengeType, Unit, VocabEntry } from '../types/domain'
import { SupabaseProgressStore, type ProgressStore } from '../lib/srs/store'

/**
 * Reorder challenges so types alternate (round-robin) instead of arriving in
 * DB order, where one type sits in a solid block. Content is loaded grouped by
 * type, so the new-item trickle would otherwise serve five of the same type in
 * a row. We group by `type` (preserving each type's original order and the
 * order in which types first appear) and emit one per type per round. Pure and
 * deterministic — no shuffle — so sessions stay reproducible.
 *
 * Counts need not be equal: when a type runs out it drops from the rotation, so
 * the tail collapses to whatever types still have items left.
 */
export function interleaveByType(challenges: readonly Challenge[]): Challenge[] {
  const groups: Challenge[][] = []
  const byType = new Map<ChallengeType, Challenge[]>()
  for (const c of challenges) {
    let group = byType.get(c.type)
    if (!group) {
      group = []
      byType.set(c.type, group)
      groups.push(group) // first-seen order fixes the rotation order
    }
    group.push(c)
  }

  const out: Challenge[] = []
  const cursors = groups.map(() => 0)
  let remaining = challenges.length
  while (remaining > 0) {
    for (let i = 0; i < groups.length; i++) {
      if (cursors[i] < groups[i].length) {
        out.push(groups[i][cursors[i]++])
        remaining -= 1
      }
    }
  }
  return out
}

export type ReviewKind = 'cards' | 'challenges'

export interface ReviewAdapter<T> {
  kind: ReviewKind
  /** This kind's items for a unit, in content order, each keyed by its UUID. */
  loadItems(unit: Unit): { id: string; content: T }[]
  /** A per-user store bound to this kind's progress table. */
  createStore(userId: string): ProgressStore
}

export const cardAdapter: ReviewAdapter<VocabEntry> = {
  kind: 'cards',
  loadItems: (unit) => unit.vocab.map((v) => ({ id: v.id, content: v })),
  createStore: (userId) => new SupabaseProgressStore('vocab_progress', 'vocab_id', userId),
}

export const challengeAdapter: ReviewAdapter<Challenge> = {
  kind: 'challenges',
  loadItems: (unit) =>
    interleaveByType(unit.challenges).map((c) => ({ id: c.id, content: c })),
  createStore: (userId) =>
    new SupabaseProgressStore('challenge_progress', 'challenge_id', userId),
}
