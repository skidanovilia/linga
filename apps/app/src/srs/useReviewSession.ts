import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { Unit } from '../types/domain'
import { SRS } from '../config'
import { leitnerStrategy } from '../lib/srs/leitner'
import {
  createReviewSession,
  type ReviewSession,
  type ReviewSessionSummary,
} from '../lib/srs/session'
import { toReviewItems } from '../lib/srs/store'
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
  error: string | null
  /** Grade the current item (persists + maybe requeues). */
  answer: (correct: boolean) => void
  /** Advance to the next item; flips to `done` at the end. */
  advance: () => void
  /** Rebuild the session from freshly-loaded progress (e.g. "review again"). */
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
  const [phase, setPhase] = useState<ReviewPhase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [, tick] = useReducer((n: number) => n + 1, 0)
  const [epoch, restart] = useReducer((n: number) => n + 1, 0)

  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    let active = true
    setPhase('loading')
    setError(null)
    sessionRef.current = null

    const items = adapter.loadItems(unit)
    const store = adapter.createStore(userId)
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
  }, [adapter, unit, userId, epoch])

  const answer = useCallback((correct: boolean) => {
    // Optimistic: local state is applied synchronously inside the controller;
    // persistence is fire-and-forget (last-write-wins for a single user).
    void sessionRef.current?.answer(correct)
  }, [])

  const advance = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    session.next()
    if (session.isComplete()) setPhase('done')
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
    error,
    answer,
    advance,
    restart,
  }
}
