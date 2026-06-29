// Thin glue between the content model and the spaced-repetition engine for memo
// cards. An adapter only: lists the unit's vocab, exposes each card's stable
// content UUID as the id, and binds to the card progress table. It contains no
// scheduling logic — that lives once in `lib/srs`. Challenges use a separate
// engine + adapter (see `challenges/run/challengeAdapter`).

import type { Unit, VocabEntry } from '../types/domain'
import { SupabaseProgressStore, type ProgressStore } from '../lib/srs/store'

export interface ReviewAdapter<T> {
  /** This kind's items for a unit, in content order, each keyed by its UUID. */
  loadItems(unit: Unit): { id: string; content: T }[]
  /** A per-user store bound to this kind's progress table. */
  createStore(userId: string): ProgressStore
}

export const cardAdapter: ReviewAdapter<VocabEntry> = {
  loadItems: (unit) => unit.vocab.map((v) => ({ id: v.id, content: v })),
  createStore: (userId) => new SupabaseProgressStore('vocab_progress', 'vocab_id', userId),
}
