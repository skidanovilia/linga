import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { Unit } from '../types/domain'
import { SRS } from '../config'
import { leitnerStrategy } from '../lib/srs/leitner'
import {
  createReviewSession,
  type ReviewSession,
  type ReviewSessionSummary,
} from '../lib/srs/session'
import {
  shelfEntry,
  summarizeShelf,
  type ShelfEntry,
  type ShelfStatus,
} from '../lib/srs/shelf'
import { toReviewItems, type ProgressStore } from '../lib/srs/store'
import type { ReviewItem } from '../lib/srs/types'
import { useAuth } from '../auth/useAuth'
import type { ReviewAdapter } from './adapters'

/**
 * `loading` → fetching progress; `empty` → nothing to do (all introduced and the
 * gate shut, or no vocabulary at all); `reviewing` → an item is on screen;
 * `done` → the queue was worked through.
 */
export type ReviewPhase = 'loading' | 'empty' | 'reviewing' | 'done'

export interface ReviewSessionState<T> {
  phase: ReviewPhase
  /**
   * What this run *is*, decided by the shelf, `null` until it has loaded. An
   * `introduce` run plays the never-met words alone and is ungated; a `review`
   * run plays what the scheduler wants back. `none`/`waiting` never start one —
   * they are `empty`, and are why deep-linking to this screen cannot slip past
   * the gate the unit card shows.
   */
  mode: ShelfEntry | null
  item: ReviewItem<T> | null
  upcoming: ReviewItem<T> | null
  /** 1-based position of the current item within the (possibly grown) queue. */
  index: number
  total: number
  /**
   * When review next opens — the whole lowest box's ripening moment, not the
   * first item's. What the "nothing due" screen counts down to.
   */
  availableAt: Date | null
  summary: ReviewSessionSummary | null
  /**
   * The shelf as it stands *after* this session's answers, evaluated once the
   * moment it completes — `null` until then, and always over the *whole* unit
   * even when the session played only part of it. Whether a repeat run may be
   * offered is `enabled` here: that is precisely "review can be entered".
   */
  outcome: ShelfStatus | null
  error: string | null
  /** Grade the current item (persists + maybe requeues). */
  answer: (correct: boolean) => void
  /** Advance to the next item; flips to `done` at the end. */
  advance: () => void
  /** Re-enter, if the gate still allows it (e.g. "review again"). */
  restart: () => void
}

/**
 * Drives one scheduled review session for a kind + unit. It loads the user's
 * progress for that unit's items, decides from the resulting shelf whether this
 * is an introduction, a review, or neither, builds the session via the engine,
 * and exposes an imperative answer/advance API. The session itself lives in a ref
 * (it is a mutable controller); a tick forces re-render when the visible item
 * changes.
 */
export function useReviewSession<T>(
  adapter: ReviewAdapter<T>,
  unit: Unit,
): ReviewSessionState<T> {
  const { user } = useAuth()
  const sessionRef = useRef<ReviewSession<T> | null>(null)
  // Kept so a repeat run can rebuild without re-fetching (see `restart`).
  const storeRef = useRef<ProgressStore | null>(null)
  // The unit's *whole* shelf as last known. A session may be built from a subset
  // of it (an introduction plays only the new words), so the gate and the outcome
  // must be judged against this, never against the session's own item list.
  const itemsRef = useRef<ReviewItem<T>[]>([])
  const [phase, setPhase] = useState<ReviewPhase>('loading')
  const [shelf, setShelf] = useState<ShelfStatus | null>(null)
  const [outcome, setOutcome] = useState<ShelfStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, tick] = useReducer((n: number) => n + 1, 0)

  const userId = user?.id

  /**
   * Consult the gate and start whatever it permits. The single entry point for
   * both the first load and a repeat run, so the two can never apply different
   * rules about what may be played.
   */
  const begin = useCallback((all: ReviewItem<T>[], store: ProgressStore) => {
    const current = summarizeShelf(all, leitnerStrategy, new Date())
    setShelf(current)

    const playable = sessionItems(all, current)
    if (!playable) {
      sessionRef.current = null
      setPhase('empty')
      return
    }
    const session = createReviewSession(playable, store, leitnerStrategy, {
      now: () => new Date(),
      requeueGap: SRS.requeueGap,
    })
    sessionRef.current = session
    setPhase(session.isComplete() ? 'empty' : 'reviewing')
  }, [])

  useEffect(() => {
    if (!userId) return
    let active = true
    setPhase('loading')
    setShelf(null)
    setOutcome(null)
    setError(null)
    sessionRef.current = null
    itemsRef.current = []

    const items = adapter.loadItems(unit)
    const store = adapter.createStore(userId)
    storeRef.current = store
    store
      .loadProgress(items.map((i) => i.id))
      .then((progress) => {
        if (!active) return
        const all = toReviewItems(items, progress)
        itemsRef.current = all
        begin(all, store)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : String(err))
      })

    return () => {
      active = false
    }
  }, [adapter, begin, unit, userId])

  const answer = useCallback((correct: boolean) => {
    // Optimistic: local state is applied synchronously inside the controller;
    // persistence is fire-and-forget (last-write-wins for a single user).
    void sessionRef.current?.answer(correct)
  }, [])

  const advance = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    session.next()
    if (session.isComplete()) {
      // Settle the shelf once, here — over the whole unit with this session's
      // answers merged in, and through the same summary the unit card reads, so
      // the two can never disagree about whether work remains. Merging matters:
      // an introduction played only the new words and knows nothing of the rest.
      const merged = mergedShelf(itemsRef.current, session)
      itemsRef.current = merged
      setOutcome(summarizeShelf(merged, leitnerStrategy, new Date()))
      setPhase('done')
    }
    tick()
  }, [])

  /**
   * Re-enter, if the gate still lets us. The shelf is rebuilt from the state this
   * session ended on — so cards just cleared are scheduled ahead and excluded —
   * and put back through the same gate as the first load: a wrong answer dropped
   * an item into box 1 due a minute out, which shuts the shelf, and a repeat run
   * must then find nothing rather than replay it. Rebuilding from memory rather
   * than re-reading also sidesteps a race with the fire-and-forget upserts.
   */
  const restart = useCallback(() => {
    const session = sessionRef.current
    const store = storeRef.current
    if (!session || !store) return

    const merged = mergedShelf(itemsRef.current, session)
    itemsRef.current = merged
    setOutcome(null)
    begin(merged, store)
    tick()
  }, [begin])

  const session = sessionRef.current
  const total = session?.summary().total ?? 0
  const remaining = session?.remaining() ?? 0

  return {
    phase,
    mode: shelf ? shelfEntry(shelf) : null,
    item: session?.current() ?? null,
    upcoming: session?.peek() ?? null,
    index: total - remaining + 1,
    total,
    availableAt: shelf?.availableAt ?? null,
    summary: phase === 'done' && session ? session.summary() : null,
    outcome,
    error,
    answer,
    advance,
    restart,
  }
}

/**
 * The gate, in one place: what a shelf hands the session builder, or `null` when
 * no session may be started at all.
 *
 * An introduction plays the never-met words *alone* — passing only those to the
 * engine leaves it no due items to find, so the plan is exactly the fresh list,
 * uncapped, and the session shuffles it. A review passes the whole shelf and lets
 * the engine pick; because the gate is open, the lowest box's items are all due
 * by definition and the ordinary session-assembly rules take it from there.
 */
function sessionItems<T>(
  all: ReviewItem<T>[],
  shelf: ShelfStatus,
): ReviewItem<T>[] | null {
  switch (shelfEntry(shelf)) {
    case 'introduce':
      return all.filter((i) => i.state === null)
    case 'review':
      return all
    default:
      return null
  }
}

/**
 * The whole shelf carrying the state a session arrived at: every item the unit
 * holds, with the session's answers layered over it by id. Items the session
 * never played keep the state they had.
 */
function mergedShelf<T>(
  all: ReviewItem<T>[],
  session: ReviewSession<T>,
): ReviewItem<T>[] {
  const played = new Map(session.itemsNow().map((i) => [i.id, i.state]))
  return all.map((i) => (played.has(i.id) ? { ...i, state: played.get(i.id) ?? null } : i))
}
