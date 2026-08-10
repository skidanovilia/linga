import { describe, expect, it } from 'vitest'
import { createLeitnerStrategy } from './leitner'
import { shelfEntry, summarizeShelf, type ShelfStatus } from './shelf'
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

/**
 * A word with a progress row on Leitner box `box`, due `deltaMs` from now. The
 * box matters as much as the due time: the review gate reads the *lowest*
 * occupied box, so a shelf's tab turns on which box a word sits in.
 */
const seenIn = (id: string, box: number, deltaMs: number) =>
  item(id, st({ box, dueAt: at(deltaMs), lastResult: 'correct' }))

/** A word with a progress row, due `deltaMs` from now, alone on its box. */
const seen = (id: string, deltaMs: number) => seenIn(id, 2, deltaMs)

/**
 * The shelf the engine reports for these words — the tabs read nothing else.
 * Built by the real `summarizeShelf` rather than hand-written, so a fixture
 * cannot claim a `ShelfStatus` the scheduler would never produce.
 */
const shelfOf = (items: ReviewItem<string>[]) => summarizeShelf(items, strategy, NOW)

/**
 * A shelf with review work the gate will not hand out: box 1 holds one ripe word
 * and one still ripening, so the lowest occupied box is only partly due however
 * overdue the box 2 word above it is. Two words due, no review available.
 */
const gatedShelf = () =>
  shelfOf([
    seenIn('ripe', 1, -MIN),
    seenIn('green', 1, DAY),
    seenIn('overdue-above', 2, -DAY),
  ])

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
  it('is Now when the lowest occupied box is fully due and nothing is left to introduce', () => {
    expect(isNowUnit(shelfOf([seen('due', -MIN)]))).toBe(true)
    // Box 1 ripe to the last word; the box 2 word ahead of schedule is not asked about.
    expect(
      isNowUnit(shelfOf([seenIn('due', 1, -DAY), seenIn('ahead', 2, DAY)])),
    ).toBe(true)
  })

  // Now AC2 — a due count is no longer the test; the gate is.
  it('is not Now when the lowest occupied box is only partly due', () => {
    const shelf = gatedShelf()
    expect(shelf.dueCount).toBeGreaterThan(0) // there *is* review work…
    expect(shelf.enabled).toBe(false) // …and the gate is shut on it
    expect(isNowUnit(shelf)).toBe(false)
  })

  // Now AC3
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

  // Now AC3 — an unintroduced word blocks review however ripe the boxes below it.
  it('never puts a unit with new words in Now, whatever else is due', () => {
    const shelves = [
      shelfOf([item('fresh'), seenIn('due', 1, -DAY)]),
      shelfOf([item('fresh'), seenIn('due', 1, -DAY), seenIn('also-due', 2, -MIN)]),
      shelfOf([item('f1'), item('f2'), seen('due', -MIN)]),
    ]
    for (const shelf of shelves) {
      expect(shelf.newCount).toBeGreaterThan(0)
      expect(shelf.dueCount).toBeGreaterThan(0)
      expect(isNowUnit(shelf)).toBe(false)
      expect(isNewUnit(shelf)).toBe(true)
    }
  })

  // Now AC4
  it('is not Now when nothing is due', () => {
    expect(isNowUnit(shelfOf([seen('ahead', DAY), seen('later', 3 * DAY)]))).toBe(false)
    expect(isNowUnit(shelfOf([]))).toBe(false)
  })
})

/**
 * Now AC4 / AC5. The tab and the launch button are meant to be the *same*
 * condition, not two conditions that agree today — so the assertion is against
 * `enabled` itself over every shelf shape, and against `shelfEntry`, which is
 * what the card and the review route branch on.
 */
describe('Now membership is exactly review availability', () => {
  const shelves: ShelfStatus[] = [
    shelfOf([]), // no vocabulary
    shelfOf([item('fresh')]), // untouched
    shelfOf([seen('due', -MIN), item('fresh')]), // due + new
    shelfOf([seenIn('due', 1, -MIN)]), // box 1 ripe
    shelfOf([seenIn('due', 1, -DAY), seenIn('ahead', 2, DAY)]), // box 1 ripe, box 2 ahead
    gatedShelf(), // due work, lowest box only partly due
    shelfOf([seenIn('ripe', 3, -MIN), seenIn('green', 3, MIN)]), // one box, half ripe
    shelfOf([seen('ahead', DAY)]), // scheduled ahead
    shelfOf([seen('ahead', DAY), seen('later', 3 * DAY)]), // scheduled ahead
  ]

  it('covers shelves on both sides of the gate', () => {
    expect(shelves.some((s) => s.enabled)).toBe(true)
    expect(shelves.some((s) => !s.enabled && s.dueCount > 0)).toBe(true)
  })

  it('puts a unit in Now if and only if its shelf is enabled', () => {
    for (const shelf of shelves) {
      expect(isNowUnit(shelf)).toBe(shelf.enabled)
    }
  })

  it('agrees with the launch entry the card offers', () => {
    for (const shelf of shelves) {
      expect(isNowUnit(shelf)).toBe(shelfEntry(shelf) === 'review')
    }
  })
})

describe('isRecentlyUnit', () => {
  // Recently AC1
  it('is Recently when everything is introduced and no review is available', () => {
    expect(isRecentlyUnit(shelfOf([seen('ahead', DAY)]))).toBe(true)
    expect(isRecentlyUnit(shelfOf([seen('ahead', DAY), seen('later', 3 * DAY)]))).toBe(true)
    expect(isRecentlyUnit(shelfOf([seen('due', -MIN)]))).toBe(false) // gate open → Now
    expect(isRecentlyUnit(shelfOf([item('fresh')]))).toBe(false) // new → New
  })

  // Now AC2 / AC5 — the gated unit has to land somewhere, and "neither New nor
  // Now" is Recently. Under the old `dueCount === 0` test it fell out of all
  // three tabs and disappeared from the page.
  it('holds a unit whose review is gated by a partly-due lowest box', () => {
    const shelf = gatedShelf()
    expect(isNewUnit(shelf)).toBe(false)
    expect(isNowUnit(shelf)).toBe(false)
    expect(isRecentlyUnit(shelf)).toBe(true)
    expect(shelf.dueCount).toBeGreaterThan(0) // due work and Recently all the same
  })

  // Recently AC2 — an untouched unit is New alone, not New *and* Recently.
  it('keeps a never-introduced word out of Recently', () => {
    const shelf = shelfOf([item('fresh')])
    expect(isNewUnit(shelf)).toBe(true)
    expect(isRecentlyUnit(shelf)).toBe(false)
  })

  // Recently AC4
  it('needs every word to have progress and no review to be open', () => {
    const settled = [seen('a', DAY), seen('b', 3 * DAY)]
    expect(isRecentlyUnit(shelfOf(settled))).toBe(true)

    // One never-reviewed word is enough to disqualify it...
    expect(isRecentlyUnit(shelfOf([...settled, item('fresh')]))).toBe(false)
    // ...as is one ripe word on a box of its own, which opens the gate.
    expect(isRecentlyUnit(shelfOf([...settled, seenIn('due', 1, -MIN)]))).toBe(false)
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

  // Recently AC3, Now AC5
  it('puts every unit with vocabulary in exactly one tab', () => {
    const shelves = [
      shelfOf([item('fresh')]), // untouched → New
      shelfOf([item('f1'), item('f2')]), // untouched → New
      shelfOf([seen('due', -MIN), item('fresh')]), // due + new → New
      shelfOf([seenIn('due', 1, -DAY), item('fresh')]), // ripe box + new → New
      shelfOf([seen('due', -MIN)]), // lowest box ripe → Now
      shelfOf([seenIn('due', 1, -DAY), seenIn('ahead', 2, DAY)]), // box 1 ripe → Now
      gatedShelf(), // due but gated → Recently
      shelfOf([seenIn('ripe', 1, -MIN), seenIn('green', 1, MIN)]), // half-ripe box → Recently
      shelfOf([seen('ahead', DAY)]), // all ahead → Recently
      shelfOf([seen('ahead', DAY), seen('later', 3 * DAY)]), // all ahead → Recently
    ]
    for (const shelf of shelves) {
      expect(shelf.total).toBeGreaterThan(0)
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
    expect(routes(shelfOf([seenIn('due', 1, -DAY), seenIn('ahead', 2, DAY)]))).toEqual([
      'now',
    ])
    expect(routes(gatedShelf())).toEqual(['recently']) // gated, not Now
    expect(routes(shelfOf([seen('ahead', DAY)]))).toEqual(['recently'])
    expect(routes(shelfOf([]))).toEqual([])
  })

  it('routes every unit to New alone when signed out, whatever the shelf says', () => {
    const anyShelf = [null, shelfOf([]), shelfOf([seen('due', -MIN)]), gatedShelf()]
    for (const shelf of anyShelf) {
      expect(
        (['new', 'now', 'recently'] as const).filter((tab) =>
          unitInTab(tab, shelf, false),
        ),
      ).toEqual(['new'])
    }
  })
})
