import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { Unit } from '../types/domain'
import type { ReviewSessionSummary } from '../lib/srs/session'
import { toReviewItems } from '../lib/srs/store'
import { useAuth } from '../auth/useAuth'
import { cardAdapter } from './adapters'
import { shuffle } from '../lib/shuffle'
import { toPracticeCards } from './practiceCards'
import type { DeckCard } from './CardReviewDeck'

/** How many cards a free-practice session draws from the candidate pool. */
const SESSION_SIZE = 20

/**
 * `loading` → building the pool; `empty` → no items have any progress yet;
 * `playing` → a card is on screen; `done` → the session was worked through.
 */
export type VocabPracticePhase = 'loading' | 'empty' | 'playing' | 'done'

export interface VocabPracticeSessionState {
  phase: VocabPracticePhase
  current: DeckCard | null
  upcoming: DeckCard | null
  index: number
  total: number
  /** Shaped to match `ReviewSummary`'s prop so the component can be reused as-is. */
  summary: ReviewSessionSummary | null
  error: string | null
  /** Record correct/wrong for the current card (local only, never persisted). */
  answer: (correct: boolean) => void
  /** Advance to the next card; flips to `done` at the end. */
  advance: () => void
  /** Rebuild the session from a freshly-shuffled pool. */
  restart: () => void
}

interface Session {
  cards: DeckCard[]
  position: number
  correct: number
  answered: number
}

/**
 * Drives one free-practice session across every unit: the candidate pool is
 * every vocab item with existing memo progress (AC1), pulled from all units
 * (AC2), of which up to 20 are drawn at random (AC3). Which side each card
 * shows is *not* drawn: `toPracticeCards` always puts the Georgian term on
 * the prompt side. Unlike `useReviewSession`, this never reads/writes box or
 * due-date state and never calls `upsertProgress` — an answer only updates
 * local counters.
 */
export function useVocabPracticeSession(units: Unit[]): VocabPracticeSessionState {
  const { user } = useAuth()
  const sessionRef = useRef<Session | null>(null)
  const [phase, setPhase] = useState<VocabPracticePhase>('loading')
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

    const items = units.flatMap((unit) => cardAdapter.loadItems(unit))
    const store = cardAdapter.createStore(userId)
    store
      .loadProgress(items.map((i) => i.id))
      .then((progress) => {
        if (!active) return
        const pool = toReviewItems(items, progress).filter((item) => item.state !== null)
        const chosen = shuffle(pool).slice(0, Math.min(SESSION_SIZE, pool.length))
        const cards = toPracticeCards(chosen)
        sessionRef.current = { cards, position: 0, correct: 0, answered: 0 }
        setPhase(cards.length === 0 ? 'empty' : 'playing')
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : String(err))
      })

    return () => {
      active = false
    }
  }, [units, userId, epoch])

  const answer = useCallback((correct: boolean) => {
    const session = sessionRef.current
    if (!session || session.position >= session.cards.length) return
    session.answered += 1
    if (correct) session.correct += 1
  }, [])

  const advance = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    session.position += 1
    if (session.position >= session.cards.length) setPhase('done')
    tick()
  }, [])

  const session = sessionRef.current
  const total = session?.cards.length ?? 0

  return {
    phase,
    current: session ? (session.cards[session.position] ?? null) : null,
    upcoming: session ? (session.cards[session.position + 1] ?? null) : null,
    index: session ? session.position + 1 : 0,
    total,
    summary:
      phase === 'done' && session
        ? { answered: session.answered, correct: session.correct, total }
        : null,
    error,
    answer,
    advance,
    restart,
  }
}
