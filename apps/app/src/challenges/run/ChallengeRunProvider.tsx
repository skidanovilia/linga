import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Challenge, Unit } from '../../types/domain'
import { CHALLENGE } from '../../config'
import {
  createClearQueueSession,
  type ClearQueueSession,
} from '../../lib/queue/clearQueue'
import type { CompletionStore } from '../../lib/queue/completionStore'
import { useAuth } from '../../auth/useAuth'
import { challengeAdapter } from './challengeAdapter'

/** A module entry's three states, derived (never tracked separately). */
export type ModuleStatus = 'not_started' | 'in_progress' | 'completed'

export interface ChallengeRunContextValue {
  /** False until the user's completed set has loaded (or while signed out). */
  ready: boolean
  /** Derived from the live in-memory run + persisted completions. */
  statusFor: (unitId: string) => ModuleStatus
  /** Distinct items left in a live run, or `null` if none is active. */
  remainingFor: (unitId: string) => number | null
  /** Resume the live run for a module, or start a fresh shuffled one. */
  resumeOrStart: (unit: Unit) => ClearQueueSession<Challenge>
  /** Always start a fresh shuffled run (replay / restart). */
  start: (unit: Unit) => ClearQueueSession<Challenge>
  /** Record a cleared run: persist completion, drop the in-memory run. */
  complete: (unitId: string) => Promise<void>
}

export const ChallengeRunContext = createContext<ChallengeRunContextValue | null>(null)

/**
 * Owns all challenge run state, app-wide. Live runs (the remaining shuffled
 * queue per module) are mutable controllers kept in a ref — purely in memory,
 * never written to the server, and lost on a full reload. The durable side is a
 * set of completed module ids loaded from `module_completion`. The module entry
 * on the units list and the run page both read this, so they can never disagree:
 * a module is "in progress" while a live run exists, "completed" once cleared,
 * else "not started". Mounted above the router outlet so leaving a run and
 * returning resumes the same queue.
 */
export function ChallengeRunProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id

  const runs = useRef<Map<string, ClearQueueSession<Challenge>>>(new Map())
  const storeRef = useRef<CompletionStore | null>(null)
  const prevUserId = useRef<string | undefined>(undefined)
  const [inProgress, setInProgress] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Runs are per-user and in-memory: drop the previous user's runs when the
    // user actually changes. Not on first mount — a deep-linked run page mounts
    // its effect (registering a run) before this parent effect, and we must not
    // clobber it.
    const switched = prevUserId.current !== undefined && prevUserId.current !== userId
    prevUserId.current = userId
    if (switched) {
      runs.current = new Map()
      setInProgress(new Set())
    }
    setReady(false)

    if (!userId) {
      storeRef.current = null
      setCompleted(new Set())
      return
    }

    let active = true
    const store = challengeAdapter.createCompletionStore(userId)
    storeRef.current = store
    store
      .loadCompleted()
      .then((ids) => {
        if (!active) return
        setCompleted(ids)
        setReady(true)
      })
      .catch(() => {
        if (active) {
          setCompleted(new Set())
          setReady(true)
        }
      })

    return () => {
      active = false
    }
  }, [userId])

  const register = useCallback((unit: Unit): ClearQueueSession<Challenge> => {
    const session = createClearQueueSession(challengeAdapter.loadItems(unit), {
      requeueGap: CHALLENGE.requeueGap,
    })
    // An empty module never becomes a tracked run — there is nothing to clear.
    if (session.isComplete()) {
      runs.current.delete(unit.id)
      setInProgress((prev) => without(prev, unit.id))
    } else {
      runs.current.set(unit.id, session)
      setInProgress((prev) => withId(prev, unit.id))
    }
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

  const complete = useCallback(async (unitId: string): Promise<void> => {
    runs.current.delete(unitId)
    setInProgress((prev) => without(prev, unitId))
    setCompleted((prev) => withId(prev, unitId)) // optimistic
    try {
      await storeRef.current?.markCompleted(unitId)
    } catch (err) {
      // The run is cleared locally; a single-user account tolerates a lost
      // write. Surface it without breaking the completion screen.
      console.error('Failed to persist module completion', err)
    }
  }, [])

  const value = useMemo<ChallengeRunContextValue>(
    () => ({
      ready,
      statusFor: (unitId) =>
        inProgress.has(unitId)
          ? 'in_progress'
          : completed.has(unitId)
            ? 'completed'
            : 'not_started',
      remainingFor: (unitId) => runs.current.get(unitId)?.remaining() ?? null,
      resumeOrStart,
      start: register,
      complete,
    }),
    [ready, inProgress, completed, resumeOrStart, register, complete],
  )

  return <ChallengeRunContext.Provider value={value}>{children}</ChallengeRunContext.Provider>
}

function withId(set: Set<string>, id: string): Set<string> {
  if (set.has(id)) return set
  const next = new Set(set)
  next.add(id)
  return next
}

function without(set: Set<string>, id: string): Set<string> {
  if (!set.has(id)) return set
  const next = new Set(set)
  next.delete(id)
  return next
}
