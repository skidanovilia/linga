import { describe, expect, it } from 'vitest'
import { toPracticeCards } from './practiceCards'
import type { ProgressState, ReviewItem } from '../lib/srs/types'
import type { VocabEntry } from '../types/domain'

const NOW = new Date('2026-06-28T12:00:00.000Z')

const state: ProgressState = {
  box: 2,
  dueAt: NOW,
  reps: 3,
  lapses: 0,
  lastResult: 'correct',
  lastSeenAt: NOW,
}

/** A vocab item as the practice pool hands it over: content plus its memory. */
function item(id: string, ka: string, ru: string): ReviewItem<VocabEntry> {
  return { id, content: { id, ka, ru }, state }
}

const pool = [
  item('a', 'გამარჯობა', 'привет'),
  item('b', 'წყალი', 'вода'),
  item('c', 'პური', 'хлеб'),
]

describe('toPracticeCards', () => {
  // Free practice AC1
  it('prompts with the Georgian term and answers with the Russian one', () => {
    expect(toPracticeCards(pool)).toEqual([
      { id: 'a', front: 'გამარჯობა', back: 'привет' },
      { id: 'b', front: 'წყალი', back: 'вода' },
      { id: 'c', front: 'პური', back: 'хлеб' },
    ])
  })

  // Free practice AC1 — stated as the property, so no card can slip through flipped.
  it('never puts the Russian translation on the prompt side', () => {
    for (const card of toPracticeCards(pool)) {
      const entry = pool.find((i) => i.id === card.id)!.content
      expect(card.front).toBe(entry.ka)
      expect(card.back).toBe(entry.ru)
      expect(card.front).not.toBe(entry.ru)
    }
  })

  // Free practice AC2 — the side used to be a per-card coin flip; repeating the
  // same input must now give byte-identical cards every time.
  it('resolves the same sides on every call, with no randomness left', () => {
    const first = toPracticeCards(pool)
    for (let i = 0; i < 20; i++) {
      expect(toPracticeCards(pool)).toEqual(first)
    }
  })

  // Free practice AC4 — mapping only: ids, order, and count pass through, and
  // the caller's pool is left untouched (selection/shuffle happen before this).
  it('keeps the pool’s ids and order and does not mutate it', () => {
    const snapshot = structuredClone(pool)
    const cards = toPracticeCards(pool)
    expect(cards.map((c) => c.id)).toEqual(['a', 'b', 'c'])
    expect(pool).toEqual(snapshot)
  })

  it('maps an empty pool to no cards', () => {
    expect(toPracticeCards([])).toEqual([])
  })
})
