import { describe, expect, it } from 'vitest'
import { createLeitnerStrategy } from './leitner'
import { summarizeShelf } from './shelf'
import { isNewUnit, isNowUnit, isRecentlyUnit, unitInTab } from './tabs'
import type { ProgressState, ReviewItem } from './types'

const MIN = 60 * 1000
const DAY = 24 * 60 * MIN

const strategy = createLeitnerStrategy()
const NOW = new Date('2026-06-28T12:00:00.000Z')
const at = (deltaMs: number) => new Date(NOW.getTime() + deltaMs)

function st(partial: Partial<ProgressState>): ProgressState {
  return {
    box: 1,
    dueAt: NOW,
    reps: 0,
    lapses: 0,
    lastResult: null,
    lastSeenAt: null,
    ...partial,
  }
}

function item(id: string, state: ProgressState | null = null): ReviewItem<string> {
  return { id, content: id, state }
}

/** A word with a progress row, due `deltaMs` from now. */
const seen = (id: string, deltaMs: number) =>
  item(id, st({ box: 2, dueAt: at(deltaMs), lastResult: 'correct' }))

/** The shelf the engine reports for these words — the tabs read nothing else. */
const shelfOf = (items: ReviewItem<string>[]) => summarizeShelf(items, strategy, NOW)

describe('unitInTab', () => {
  it('shows every unit under New alone when signed out', () => {
    expect(unitInTab('new', null, false)).toBe(true)
    expect(unitInTab('now', null, false)).toBe(false)
    expect(unitInTab('recently', null, false)).toBe(false)
  })

  it('puts a unit in no tab while a signed-in user’s progress is still unknown', () => {
    expect(unitInTab('new', null, true)).toBe(false)
    expect(unitInTab('now', null, true)).toBe(false)
    expect(unitInTab('recently', null, true)).toBe(false)
  })
})

describe('isNewUnit', () => {
  // New AC1
  it('is New when any word has never been introduced', () => {
    expect(isNewUnit(shelfOf([item('fresh')]))).toBe(true)
    expect(isNewUnit(shelfOf([seen('done', DAY), item('fresh')]))).toBe(true)
    expect(isNewUnit(shelfOf([seen('due', -MIN), item('fresh')]))).toBe(true)
  })

  // New AC2
  it('is not New once every word has a progress row', () => {
    expect(isNewUnit(shelfOf([seen('due', -MIN), seen('ahead', DAY)]))).toBe(false)
    expect(isNewUnit(shelfOf([]))).toBe(false)
  })

  // New AC3
  it('depends on nothing but the vocabulary state', () => {
    const introduced = shelfOf([seen('a', -MIN), seen('b', DAY)])
    const oneLeft = shelfOf([seen('a', -MIN), seen('b', DAY), item('c')])
    expect(isNewUnit(introduced)).toBe(false)
    expect(isNewUnit(oneLeft)).toBe(true) // the single uninitiated word is the only difference
  })
})

describe('isNowUnit', () => {
  // Now AC1
  it('is Now when a word is due and nothing is left to introduce', () => {
    expect(isNowUnit(shelfOf([seen('due', -MIN)]))).toBe(true)
    expect(isNowUnit(shelfOf([seen('due', -DAY), seen('ahead', DAY)]))).toBe(true)
  })

  // Now AC2
  it('does not count a brand-new word as review work', () => {
    expect(isNowUnit(shelfOf([item('fresh')]))).toBe(false)
    expect(isNowUnit(shelfOf([item('f1'), item('f2')]))).toBe(false)
  })

  // Now AC3
  it('sends a unit with both a due and a new word to New, not Now', () => {
    const shelf = shelfOf([seen('due', -MIN), item('fresh')])
    expect(isNewUnit(shelf)).toBe(true)
    expect(isNowUnit(shelf)).toBe(false)
  })

  // Now AC4
  it('is not Now when nothing is due', () => {
    expect(isNowUnit(shelfOf([seen('ahead', DAY), seen('later', 3 * DAY)]))).toBe(false)
    expect(isNowUnit(shelfOf([]))).toBe(false)
  })
})

describe('isRecentlyUnit', () => {
  // Recently AC1
  it('is Recently when nothing is available to review now', () => {
    expect(isRecentlyUnit(shelfOf([seen('ahead', DAY)]))).toBe(true)
    expect(isRecentlyUnit(shelfOf([]))).toBe(true) // a unit with no vocabulary at all
    expect(isRecentlyUnit(shelfOf([seen('due', -MIN)]))).toBe(false)
  })

  // Recently AC2
  it('never overlaps Now', () => {
    const shelves = [
      shelfOf([seen('due', -MIN)]),
      shelfOf([seen('ahead', DAY)]),
      shelfOf([item('fresh')]),
      shelfOf([seen('due', -MIN), item('fresh')]),
      shelfOf([]),
    ]
    for (const shelf of shelves) {
      expect(isNowUnit(shelf) && isRecentlyUnit(shelf)).toBe(false)
    }
  })

  // Recently AC3
  it('lets a never-introduced word sit in Recently as well as New', () => {
    const shelf = shelfOf([item('fresh')])
    expect(isRecentlyUnit(shelf)).toBe(true)
    expect(isNewUnit(shelf)).toBe(true)
  })
})
