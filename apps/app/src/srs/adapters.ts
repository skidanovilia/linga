// Thin per-kind glue between the content model and the shared review engine.
// An adapter only: lists its kind's content items, exposes each one's stable
// content UUID as the id, and binds to that kind's progress table. It contains
// no scheduling logic — that lives once in `lib/srs`.

import type { Challenge, Unit, VocabEntry } from '../types/domain'
import { SupabaseProgressStore, type ProgressStore } from '../lib/srs/store'

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
  loadItems: (unit) => unit.challenges.map((c) => ({ id: c.id, content: c })),
  createStore: (userId) =>
    new SupabaseProgressStore('challenge_progress', 'challenge_id', userId),
}
