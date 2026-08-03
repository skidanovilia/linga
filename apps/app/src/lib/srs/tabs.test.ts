import { describe, expect, it } from 'vitest'
import { createLeitnerStrategy } from './leitner'
import { summarizeShelf, type ShelfStatus } from './shelf'
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
  it('is Recently only when nothing is new and nothing is due', () => {
    expect(isRecentlyUnit(shelfOf([seen('ahead', DAY)]))).toBe(true)
    expect(isRecentlyUnit(shelfOf([seen('ahead', DAY), seen('later', 3 * DAY)]))).toBe(true)
    expect(isRecentlyUnit(shelfOf([seen('due', -MIN)]))).toBe(false) // due → Now
    expect(isRecentlyUnit(shelfOf([item('fresh')]))).toBe(false) // new → New
  })

  // Recently AC2 — an untouched unit is New alone, not New *and* Recently.
  it('keeps a never-introduced word out of Recently', () => {
    const shelf = shelfOf([item('fresh')])
    expect(isNewUnit(shelf)).toBe(true)
    expect(isRecentlyUnit(shelf)).toBe(false)
  })

  // Recently AC4
  it('needs every word to have progress and be scheduled ahead', () => {
    const settled = [seen('a', DAY), seen('b', 3 * DAY)]
    expect(isRecentlyUnit(shelfOf(settled))).toBe(true)

    // One never-reviewed word is enough to disqualify it...
    expect(isRecentlyUnit(shelfOf([...settled, item('fresh')]))).toBe(false)
    // ...as is one word whose moment has arrived.
    expect(isRecentlyUnit(shelfOf([...settled, seen('due', -MIN)]))).toBe(false)
  })

  it('is no tab at all for a unit with no vocabulary', () => {
    const none = shelfOf([])
    expect(isRecentlyUnit(none)).toBe(false)
    expect(isNewUnit(none)).toBe(false)
    expect(isNowUnit(none)).toBe(false)
  })
})

/**
 * The property the three predicates exist to satisfy. Asserted over the shelf
 * shapes that can actually occur rather than case by case, so a future edit to
 * any one predicate cannot quietly reopen an overlap or a gap.
 */
describe('the tabs partition the units', () => {
  const inTabs = (shelf: ShelfStatus | null) =>
    [isNewUnit, isNowUnit, isRecentlyUnit].filter((p) => p(shelf)).length

  // Recently AC3
  it('puts every unit with vocabulary in exactly one tab', () => {
    const shelves = [
      shelfOf([item('fresh')]), // untouched → New
      shelfOf([item('f1'), item('f2')]), // untouched → New
      shelfOf([seen('due', -MIN), item('fresh')]), // due + new → New
      shelfOf([seen('due', -MIN)]), // due → Now
      shelfOf([seen('due', -DAY), seen('ahead', DAY)]), // due + ahead → Now
      shelfOf([seen('ahead', DAY)]), // all ahead → Recently
      shelfOf([seen('ahead', DAY), seen('later', 3 * DAY)]), // all ahead → Recently
    ]
    for (const shelf of shelves) {
      expect(inTabs(shelf)).toBe(1)
    }
  })

  it('puts a unit with no vocabulary, and an unknown shelf, in none', () => {
    expect(inTabs(shelfOf([]))).toBe(0)
    expect(inTabs(null)).toBe(0)
  })
})

describe('unitInTab routing', () => {
  const routes = (shelf: ShelfStatus | null) =>
    (['new', 'now', 'recently'] as const).filter((tab) => unitInTab(tab, shelf, true))

  it('routes each shelf shape to its one tab for a signed-in user', () => {
    expect(routes(shelfOf([item('fresh')]))).toEqual(['new'])
    expect(routes(shelfOf([seen('due', -MIN), item('fresh')]))).toEqual(['new'])
    expect(routes(shelfOf([seen('due', -MIN)]))).toEqual(['now'])
    expect(routes(shelfOf([seen('ahead', DAY)]))).toEqual(['recently'])
    expect(routes(shelfOf([]))).toEqual([])
  })
})
