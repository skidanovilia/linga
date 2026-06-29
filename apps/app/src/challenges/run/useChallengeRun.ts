import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { Challenge, Unit } from '../../types/domain'
import type { ClearQueueSession } from '../../lib/queue/clearQueue'
import { useChallengeRuns } from './useChallengeRuns'

/**
 * `loading` → waiting for the passed set / resolving the run; `empty` → the
 * module has no challenges; `running` → a challenge is on screen; `done` → every
 * challenge is passed (the queue is empty with nothing left not-passed).
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
  /** Replay: reset persisted progress and start a fresh shuffled queue. */
  restart: () => void
}

/**
 * Drives one module's clear-the-queue run. The live session comes from the
 * app-wide provider, built from the module's *not-passed* challenges, so leaving
 * and returning within a session resumes the same queue while a full reload
 * rebuilds from whatever is still not-passed. A correct (or corrected) answer
 * persists that challenge as passed immediately, before the next item is shown
 * (direct upsert to challenge_progress — no RPC); a wrong answer re-queues it and
 * writes nothing. The session is a mutable controller held in a ref; a tick
 * re-renders on advance.
 */
export function useChallengeRun(unit: Unit): ChallengeRunState {
  const { resumeOrStart, replay, markPassed, ready } = useChallengeRuns()
  const sessionRef = useRef<ClearQueueSession<Challenge> | null>(null)
  const [phase, setPhase] = useState<ChallengeRunPhase>('loading')
  const [, tick] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    // Wait for the passed set: registering before it loads would treat every
    // challenge as not-passed and re-queue already-cleared items.
    if (!ready) return
    const session = resumeOrStart(unit)
    sessionRef.current = session
    setPhase(phaseFor(unit, session))
    // `resumeOrStart` is stable; re-runs only when the unit or readiness changes.
  }, [unit, ready, resumeOrStart])

  const answer = useCallback(
    (correct: boolean) => {
      const session = sessionRef.current
      const current = session?.current()
      session?.answer(correct)
      // correct OR corrected clears the item; persist it as passed. A wrong
      // answer re-queues it (handled by the engine) and writes nothing.
      if (correct && current) void markPassed(current.id)
    },
    [markPassed],
  )

  const advance = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    session.next()
    // Each cleared item was already persisted; completion is derived, so there
    // is nothing more to write here.
    if (session.isComplete()) setPhase('done')
    else tick()
  }, [])

  const restart = useCallback(() => {
    const session = replay(unit)
    sessionRef.current = session
    setPhase(phaseFor(unit, session))
    tick()
  }, [replay, unit])

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

/**
 * Distinguish a module with no challenges (`empty`) from one whose challenges are
 * all already passed (`done` → completion screen) from one with work left
 * (`running`).
 */
function phaseFor(unit: Unit, session: ClearQueueSession<Challenge>): ChallengeRunPhase {
  if (unit.challenges.length === 0) return 'empty'
  return session.isComplete() ? 'done' : 'running'
}
