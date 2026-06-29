import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Challenge, Unit } from '../../types/domain'
import { CHALLENGE } from '../../config'
import {
  createClearQueueSession,
  type ClearQueueSession,
} from '../../lib/queue/clearQueue'
import type { ChallengeProgressStore } from '../../lib/queue/challengeProgressStore'
import { useAuth } from '../../auth/useAuth'
import { challengeAdapter } from './challengeAdapter'

/** A module entry's three states, derived (never tracked separately). */
export type ModuleStatus = 'not_started' | 'in_progress' | 'completed'

export interface ChallengeRunContextValue {
  /** False until the user's passed set has loaded (or while signed out). */
  ready: boolean
  /** Derived from persisted passed rows vs the module's challenges. */
  statusFor: (unit: Unit) => ModuleStatus
  /** Challenges in this module not yet passed (the queue size on next entry). */
  remainingFor: (unit: Unit) => number
  /** Resume the live run for a module, or start a fresh shuffled one from its
   *  not-passed challenges. */
  resumeOrStart: (unit: Unit) => ClearQueueSession<Challenge>
  /** Replay: reset the module's persisted progress, then start a fresh run over
   *  all of its challenges. */
  replay: (unit: Unit) => ClearQueueSession<Challenge>
  /** Persist one challenge as passed once it is cleared. */
  markPassed: (challengeId: string) => Promise<void>
}

export const ChallengeRunContext = createContext<ChallengeRunContextValue | null>(null)

/**
 * Owns all challenge run state, app-wide. Live runs (the remaining shuffled
 * queue per module) are mutable controllers kept in a ref — purely in memory,
 * never written to the server, and lost on a full reload. The durable side is a
 * set of *passed challenge ids* loaded from `challenge_progress`: a challenge
 * with a row is cleared, one without is still in the queue. A module's entry on
 * the units list and the run page both derive from this set — a module is
 * "in progress" once some (but not all) of its challenges are passed,
 * "completed" once all are, else "not started" — so they can never disagree.
 * On a full reload the live run is gone but the passed rows remain, so re-entry
 * rebuilds the queue from exactly the not-passed challenges (a fresh shuffle of
 * whatever is left). Mounted above the router outlet so leaving a run and
 * returning within a session resumes the same in-memory queue.
 */
export function ChallengeRunProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id

  const runs = useRef<Map<string, ClearQueueSession<Challenge>>>(new Map())
  const storeRef = useRef<ChallengeProgressStore | null>(null)
  // Mirror of `passed` for synchronous reads inside `register` (which must stay
  // a stable callback so the run-page effect does not re-fire mid-run).
  const passedRef = useRef<Set<string>>(new Set())
  const prevUserId = useRef<string | undefined>(undefined)
  const [passed, setPassed] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  const applyPassed = useCallback((next: Set<string>) => {
    passedRef.current = next
    setPassed(next)
  }, [])

  useEffect(() => {
    // Runs are per-user and in-memory: drop the previous user's runs when the
    // user actually changes. Not on first mount — a deep-linked run page mounts
    // its effect (registering a run) before this parent effect, and we must not
    // clobber it.
    const switched = prevUserId.current !== undefined && prevUserId.current !== userId
    prevUserId.current = userId
    if (switched) runs.current = new Map()
    setReady(false)

    if (!userId) {
      storeRef.current = null
      applyPassed(new Set())
      return
    }

    let active = true
    const store = challengeAdapter.createStore(userId)
    storeRef.current = store
    store
      .loadPassed()
      .then((ids) => {
        if (!active) return
        applyPassed(ids)
        setReady(true)
      })
      .catch(() => {
        if (active) {
          applyPassed(new Set())
          setReady(true)
        }
      })

    return () => {
      active = false
    }
  }, [userId, applyPassed])

  const register = useCallback((unit: Unit): ClearQueueSession<Challenge> => {
    // Build the queue from exactly this module's not-passed challenges.
    const items = challengeAdapter
      .loadItems(unit)
      .filter((item) => !passedRef.current.has(item.id))
    const session = createClearQueueSession(items, { requeueGap: CHALLENGE.requeueGap })
    // An empty queue (no challenges, or all already passed) is not a tracked run.
    if (session.isComplete()) runs.current.delete(unit.id)
    else runs.current.set(unit.id, session)
    return session
  }, [])

  const resumeOrStart = useCallback(
    (unit: Unit): ClearQueueSession<Challenge> => {
      const existing = runs.current.get(unit.id)
      if (existing && !existing.isComplete()) return existing
      return register(unit)
    },
    [register],
  )

  const markPassed = useCallback(async (challengeId: string): Promise<void> => {
    if (passedRef.current.has(challengeId)) return
    applyPassed(withId(passedRef.current, challengeId)) // optimistic
    try {
      await storeRef.current?.markPassed(challengeId)
    } catch (err) {
      // The item is cleared locally; a single-user account tolerates a lost
      // write. Surface it without breaking the run.
      console.error('Failed to persist challenge progress', err)
    }
  }, [applyPassed])

  const replay = useCallback(
    (unit: Unit): ClearQueueSession<Challenge> => {
      const ids = unit.challenges.map((c) => c.id)
      applyPassed(without(passedRef.current, ids)) // optimistic: all not-passed again
      const session = register(unit) // now rebuilds over every challenge
      storeRef.current?.resetModule(ids).catch((err) => {
        console.error('Failed to reset challenge progress', err)
      })
      return session
    },
    [register, applyPassed],
  )

  const value = useMemo<ChallengeRunContextValue>(
    () => ({
      ready,
      statusFor: (unit) => statusFor(unit, passed),
      remainingFor: (unit) => unit.challenges.filter((c) => !passed.has(c.id)).length,
      resumeOrStart,
      replay,
      markPassed,
    }),
    [ready, passed, resumeOrStart, replay, markPassed],
  )

  return <ChallengeRunContext.Provider value={value}>{children}</ChallengeRunContext.Provider>
}

/**
 * Module entry state, derived from passed rows vs the module's challenges. A
 * zero-challenge module reports `not_started` (it shows "Start" and lands on the
 * empty state), not a vacuous `completed`.
 */
function statusFor(unit: Unit, passed: Set<string>): ModuleStatus {
  const total = unit.challenges.length
  const passedCount = unit.challenges.filter((c) => passed.has(c.id)).length
  if (passedCount === 0) return 'not_started'
  if (passedCount < total) return 'in_progress'
  return 'completed'
}

function withId(set: Set<string>, id: string): Set<string> {
  if (set.has(id)) return set
  const next = new Set(set)
  next.add(id)
  return next
}

function without(set: Set<string>, ids: string[]): Set<string> {
  if (!ids.some((id) => set.has(id))) return set
  const next = new Set(set)
  for (const id of ids) next.delete(id)
  return next
}
