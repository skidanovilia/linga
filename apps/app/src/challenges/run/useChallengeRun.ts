import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { Challenge, Unit } from '../../types/domain'
import type { ClearQueueSession } from '../../lib/queue/clearQueue'
import type { ChallengeRun } from './ChallengeRunProvider'
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
  /** All-time solved (persisted at start + this run), over the unit's full total. */
  solved: number
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
  const runRef = useRef<ChallengeRun | null>(null)
  const [phase, setPhase] = useState<ChallengeRunPhase>('loading')
  const [, tick] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    // Wait for the passed set: registering before it loads would treat every
    // challenge as not-passed and re-queue already-cleared items.
    if (!ready) return
    const run = resumeOrStart(unit)
    runRef.current = run
    setPhase(phaseFor(unit, run.session))
    // `resumeOrStart` is stable; re-runs only when the unit or readiness changes.
  }, [unit, ready, resumeOrStart])

  const answer = useCallback(
    (correct: boolean) => {
      const session = runRef.current?.session
      const current = session?.current()
      session?.answer(correct)
      // correct OR corrected clears the item; persist it as passed. A wrong
      // answer re-queues it (handled by the engine) and writes nothing. The unit
      // is passed so the provider can light the permanent badge on the last pass.
      if (correct && current) void markPassed(unit, current.id)
    },
    [markPassed, unit],
  )

  const advance = useCallback(() => {
    const session = runRef.current?.session
    if (!session) return
    session.next()
    // Each cleared item was already persisted; completion is derived, so there
    // is nothing more to write here.
    if (session.isComplete()) setPhase('done')
    else tick()
  }, [])

  const restart = useCallback(() => {
    const run = replay(unit)
    runRef.current = run
    setPhase(phaseFor(unit, run.session))
    tick()
  }, [replay, unit])

  const run = runRef.current
  const session = run?.session
  // All-time solved = the start-of-run snapshot + items cleared this run
  // (summary().correct). The snapshot is frozen, so this only grows toward
  // total/total and never double-counts a freshly-persisted pass.
  const passedThisRun = session?.summary().correct ?? 0

  return {
    phase,
    challenge: phase === 'running' ? (session?.current()?.content ?? null) : null,
    step: session?.step ?? 0,
    solved: (run?.persistedPassedAtStart ?? 0) + passedThisRun,
    total: run?.total ?? 0,
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
