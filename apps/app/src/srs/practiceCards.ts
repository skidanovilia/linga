// How free practice resolves each vocab pair onto a card's two sides. Kept in
// its own module — free of React and of the Supabase-backed session hook — so
// the rule is a pure function that can be asserted directly in a test.

import type { VocabEntry } from '../types/domain'
import type { ReviewItem } from '../lib/srs/types'
import type { DeckCard } from './CardReviewDeck'

/**
 * Lays out free-practice cards Georgian-side up: `front` — the prompt shown
 * before the flip — is always the Georgian term, `back` always the Russian
 * translation (AC1). The side is fixed, not drawn per card (AC2). Scheduled
 * review resolves its own sides at its call site and is unaffected (AC3);
 * order and pool selection happen before this and are left untouched (AC4).
 */
export function toPracticeCards(items: ReviewItem<VocabEntry>[]): DeckCard[] {
  return items.map((item) => ({
    id: item.id,
    front: item.content.ka,
    back: item.content.ru,
  }))
}
