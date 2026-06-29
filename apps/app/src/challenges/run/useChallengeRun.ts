import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { Challenge, Unit } from '../../types/domain'
import type { ClearQueueSession } from '../../lib/queue/clearQueue'
import { useChallengeRuns } from './useChallengeRuns'

/**
 * `loading` → resolving the run; `empty` → the module has no challenges;
 * `running` → a challenge is on screen; `done` → the queue was cleared.
 */
export type ChallengeRunPhase = 'loading' | 'empty' | 'running' | 'done'

export interface ChallengeRunState {
  phase: ChallengeRunPhase
  challenge: Challenge | null
  /** Key for the renderer so each presentation resets answer/status state. */
  step: number
  /** Items cleared so far, and the module's distinct total. */
  cleared: number
  total: number
  answer: (correct: boolean) => void
  advance: () => void
  /** Replay: discard the run and start a fresh shuffled queue from scratch. */
  restart: () => void
}

/**
 * Drives one module's clear-the-queue run. The live session comes from the
 * app-wide provider, so leaving and returning resumes the same queue; replay
 * forces a fresh shuffle. On clearing the queue it records module completion
 * through the provider (direct upsert to module_completion — no RPC). The
 * session is a mutable controller held in a ref; a tick re-renders on advance.
 */
export function useChallengeRun(unit: Unit): ChallengeRunState {
  const { resumeOrStart, start, complete } = useChallengeRuns()
  const sessionRef = useRef<ClearQueueSession<Challenge> | null>(null)
  const [phase, setPhase] = useState<ChallengeRunPhase>('loading')
  const [, tick] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    const session = resumeOrStart(unit)
    sessionRef.current = session
    setPhase(session.isComplete() ? 'empty' : 'running')
    // `resumeOrStart` is stable; re-runs only when the unit changes.
  }, [unit, resumeOrStart])

  const answer = useCallback((correct: boolean) => {
    sessionRef.current?.answer(correct)
  }, [])

  const advance = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    session.next()
    if (session.isComplete()) {
      void complete(unit.id)
      setPhase('done')
    } else {
      tick()
    }
  }, [complete, unit.id])

  const restart = useCallback(() => {
    const session = start(unit)
    sessionRef.current = session
    setPhase(session.isComplete() ? 'empty' : 'running')
    tick()
  }, [start, unit])

  const session = sessionRef.current
  const summary = session?.summary() ?? { answered: 0, correct: 0, total: 0 }

  return {
    phase,
    challenge: phase === 'running' ? (session?.current()?.content ?? null) : null,
    step: session?.step ?? 0,
    cleared: summary.correct,
    total: summary.total,
    answer,
    advance,
    restart,
  }
}
