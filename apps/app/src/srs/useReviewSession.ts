import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { Unit } from '../types/domain'
import { SRS } from '../config'
import { leitnerStrategy } from '../lib/srs/leitner'
import {
  createReviewSession,
  type ReviewSession,
  type ReviewSessionSummary,
} from '../lib/srs/session'
import { summarizeShelf, type ShelfStatus } from '../lib/srs/shelf'
import { toReviewItems, type ProgressStore } from '../lib/srs/store'
import type { ReviewItem } from '../lib/srs/types'
import { useAuth } from '../auth/useAuth'
import type { ReviewAdapter } from './adapters'

/**
 * `loading` → fetching progress; `empty` → nothing due or new (all reviewed);
 * `reviewing` → an item is on screen; `done` → the queue was worked through.
 */
export type ReviewPhase = 'loading' | 'empty' | 'reviewing' | 'done'

export interface ReviewSessionState<T> {
  phase: ReviewPhase
  item: ReviewItem<T> | null
  upcoming: ReviewItem<T> | null
  /** 1-based position of the current item within the (possibly grown) queue. */
  index: number
  total: number
  nextDueAt: Date | null
  summary: ReviewSessionSummary | null
  /**
   * The shelf as it stands *after* this session's answers, evaluated once the
   * moment it completes — `null` until then. Distinct from `nextDueAt`, which
   * the plan fixed before any answer landed. Whether a repeat run has anything
   * to offer is `dueCount > 0` here.
   */
  outcome: ShelfStatus | null
  error: string | null
  /** Grade the current item (persists + maybe requeues). */
  answer: (correct: boolean) => void
  /** Advance to the next item; flips to `done` at the end. */
  advance: () => void
  /** Re-run against whatever is due right now (e.g. "review again"). */
  restart: () => void
}

/**
 * Drives one scheduled review session for a kind + unit. It loads the user's
 * progress for that unit's items, builds the session via the engine, and exposes
 * an imperative answer/advance API. The session itself lives in a ref (it is a
 * mutable controller); a tick forces re-render when the visible item changes.
 */
export function useReviewSession<T>(
  adapter: ReviewAdapter<T>,
  unit: Unit,
): ReviewSessionState<T> {
  const { user } = useAuth()
  const sessionRef = useRef<ReviewSession<T> | null>(null)
  // Kept so a repeat run can rebuild without re-fetching (see `restart`).
  const storeRef = useRef<ProgressStore | null>(null)
  const [phase, setPhase] = useState<ReviewPhase>('loading')
  const [outcome, setOutcome] = useState<ShelfStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, tick] = useReducer((n: number) => n + 1, 0)

  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    let active = true
    setPhase('loading')
    setOutcome(null)
    setError(null)
    sessionRef.current = null

    const items = adapter.loadItems(unit)
    const store = adapter.createStore(userId)
    storeRef.current = store
    store
      .loadProgress(items.map((i) => i.id))
      .then((progress) => {
        if (!active) return
        const session = createReviewSession(
          toReviewItems(items, progress),
          store,
          leitnerStrategy,
          { now: () => new Date(), requeueGap: SRS.requeueGap },
        )
        sessionRef.current = session
        setPhase(session.isComplete() ? 'empty' : 'reviewing')
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : String(err))
      })

    return () => {
      active = false
    }
  }, [adapter, unit, userId])

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
      // Settle the shelf once, here — the same summary the unit card reads, so
      // the two can never disagree about whether work remains.
      setOutcome(summarizeShelf(session.itemsNow(), leitnerStrategy, new Date()))
      setPhase('done')
    }
    tick()
  }, [])

  /**
   * Re-run against what is due *now*: the queue is rebuilt from the state this
   * session ended on, so cards just cleared (scheduled into the future) are
   * excluded and only genuinely-due work returns. Rebuilding from memory rather
   * than re-reading also sidesteps a race with the fire-and-forget upserts.
   */
  const restart = useCallback(() => {
    const session = sessionRef.current
    const store = storeRef.current
    if (!session || !store) return

    const next = createReviewSession(session.itemsNow(), store, leitnerStrategy, {
      now: () => new Date(),
      requeueGap: SRS.requeueGap,
    })
    sessionRef.current = next
    setOutcome(null)
    setPhase(next.isComplete() ? 'empty' : 'reviewing')
    tick()
  }, [])

  const session = sessionRef.current
  const total = session?.summary().total ?? 0
  const remaining = session?.remaining() ?? 0

  return {
    phase,
    item: session?.current() ?? null,
    upcoming: session?.peek() ?? null,
    index: total - remaining + 1,
    total,
    nextDueAt: session?.nextDueAt ?? null,
    summary: phase === 'done' && session ? session.summary() : null,
    outcome,
    error,
    answer,
    advance,
    restart,
  }
}
