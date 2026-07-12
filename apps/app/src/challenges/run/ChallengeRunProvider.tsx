import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Challenge, Unit } from '../../types/domain'
import { CHALLENGE } from '../../config'
import {
  createClearQueueSession,
  type ClearQueueSession,
} from '../../lib/queue/clearQueue'
import type { ChallengeProgressStore } from '../../lib/queue/challengeProgressStore'
import type { UnitCompletionStore } from '../../lib/queue/unitCompletionStore'
import { useAuth } from '../../auth/useAuth'
import { challengeAdapter } from './challengeAdapter'

/** A module entry's three states, derived (never tracked separately). */
export type ModuleStatus = 'not_started' | 'in_progress' | 'completed'

/**
 * A live run plus the start-of-run snapshot that the all-time progress counter
 * needs. The snapshot is frozen when the run is registered and never re-read, so
 * `persistedPassedAtStart + session.summary().correct` (cleared this run) counts
 * each pass exactly once — adding the live persisted count would double-count.
 */
export interface ChallengeRun {
  session: ClearQueueSession<Challenge>
  /** challenge_progress rows for this unit at run start — frozen, never re-read. */
  persistedPassedAtStart: number
  /** The unit's full challenge count (counter denominator). */
  total: number
}

export interface ChallengeRunContextValue {
  /** False until the user's passed set has loaded (or while signed out). */
  ready: boolean
  /** Derived from persisted passed rows vs the module's challenges. */
  statusFor: (unit: Unit) => ModuleStatus
  /** Challenges in this module not yet passed (the queue size on next entry). */
  remainingFor: (unit: Unit) => number
  /** Whether this unit has ever been completed — the permanent badge. Read from
   *  the write-once `unit_completion` set, NOT derived from `passed`, so it stays
   *  true after a replay resets the counter back to 0/total. */
  hasUnitCompletion: (unit: Unit) => boolean
  /** Resume the live run for a module, or start a fresh shuffled one from its
   *  not-passed challenges. */
  resumeOrStart: (unit: Unit) => ChallengeRun
  /** Replay: reset the module's persisted progress, then start a fresh run over
   *  all of its challenges. */
  replay: (unit: Unit) => ChallengeRun
  /** Persist one challenge as passed once it is cleared. The unit is needed to
   *  detect the last pass and light the permanent completion badge. */
  markPassed: (unit: Unit, challengeId: string) => Promise<void>
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

  const runs = useRef<Map<string, ChallengeRun>>(new Map())
  const storeRef = useRef<ChallengeProgressStore | null>(null)
  const completionStoreRef = useRef<UnitCompletionStore | null>(null)
  // Mirror of `passed` for synchronous reads inside `register` (which must stay
  // a stable callback so the run-page effect does not re-fire mid-run).
  const passedRef = useRef<Set<string>>(new Set())
  // Mirror of `completed` for synchronous reads/dedupe inside `markPassed`.
  const completedRef = useRef<Set<string>>(new Set())
  const prevUserId = useRef<string | undefined>(undefined)
  const [passed, setPassed] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  const applyPassed = useCallback((next: Set<string>) => {
    passedRef.current = next
    setPassed(next)
  }, [])

  const applyCompleted = useCallback((next: Set<string>) => {
    completedRef.current = next
    setCompleted(next)
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
      completionStoreRef.current = null
      applyPassed(new Set())
      applyCompleted(new Set())
      return
    }

    let active = true
    const store = challengeAdapter.createStore(userId)
    const completionStore = challengeAdapter.createCompletionStore(userId)
    storeRef.current = store
    completionStoreRef.current = completionStore
    // Load both durable sets before going ready: the resettable per-item passes
    // (queue/counter) and the permanent per-unit completions (badge).
    Promise.all([store.loadPassed(), completionStore.loadCompletedUnits()])
      .then(([passedIds, completedIds]) => {
        if (!active) return
        applyPassed(passedIds)
        applyCompleted(completedIds)
        setReady(true)
      })
      .catch(() => {
        if (active) {
          applyPassed(new Set())
          applyCompleted(new Set())
          setReady(true)
        }
      })

    return () => {
      active = false
    }
  }, [userId, applyPassed, applyCompleted])

  const register = useCallback((unit: Unit): ChallengeRun => {
    // Build the queue from exactly this module's not-passed challenges.
    const items = challengeAdapter
      .loadItems(unit)
      .filter((item) => !passedRef.current.has(item.id))
    const session = createClearQueueSession(items, { requeueGap: CHALLENGE.requeueGap })
    // Snapshot the all-time progress counter's two ends once, at run start: the
    // unit's full challenge count (denominator) and how many were already passed
    // (numerator base). Frozen here so it never re-reads the growing passed set.
    const total = unit.challenges.length
    const run: ChallengeRun = { session, persistedPassedAtStart: total - items.length, total }
    // An empty queue (no challenges, or all already passed) is not a tracked run,
    // but the run (already at total/total) is still returned for display.
    if (session.isComplete()) runs.current.delete(unit.id)
    else runs.current.set(unit.id, run)
    return run
  }, [])

  const resumeOrStart = useCallback(
    (unit: Unit): ChallengeRun => {
      const existing = runs.current.get(unit.id)
      if (existing && !existing.session.isComplete()) return existing
      return register(unit)
    },
    [register],
  )

  // Light the permanent badge for a unit. Idempotent locally (skip if already
  // lit) and durably (the store's insert is on-conflict-do-nothing). Optimistic:
  // the badge shows immediately; a failed write is tolerated like markPassed.
  const markUnitCompleted = useCallback(
    (unitId: string): void => {
      if (completedRef.current.has(unitId)) return
      applyCompleted(withId(completedRef.current, unitId))
      completionStoreRef.current?.markUnitCompleted(unitId).catch((err) => {
        console.error('Failed to persist unit completion', err)
      })
    },
    [applyCompleted],
  )

  const markPassed = useCallback(
    async (unit: Unit, challengeId: string): Promise<void> => {
      if (passedRef.current.has(challengeId)) return
      const next = withId(passedRef.current, challengeId)
      applyPassed(next) // optimistic
      // If this pass clears the unit's last not-passed challenge, the unit is now
      // complete — light the permanent badge. Uses the same derivation as the
      // unit list, so a zero-challenge unit (never 'completed') never earns it.
      if (statusFor(unit, next) === 'completed') markUnitCompleted(unit.id)
      try {
        await storeRef.current?.markPassed(challengeId)
      } catch (err) {
        // The item is cleared locally; a single-user account tolerates a lost
        // write. Surface it without breaking the run.
        console.error('Failed to persist challenge progress', err)
      }
    },
    [applyPassed, markUnitCompleted],
  )

  const replay = useCallback(
    (unit: Unit): ChallengeRun => {
      const ids = unit.challenges.map((c) => c.id)
      applyPassed(without(passedRef.current, ids)) // optimistic: all not-passed again
      const run = register(unit) // now rebuilds over every challenge (snapshot → 0)
      storeRef.current?.resetModule(ids).catch((err) => {
        console.error('Failed to reset challenge progress', err)
      })
      return run
    },
    [register, applyPassed],
  )

  const value = useMemo<ChallengeRunContextValue>(
    () => ({
      ready,
      statusFor: (unit) => statusFor(unit, passed),
      remainingFor: (unit) => unit.challenges.filter((c) => !passed.has(c.id)).length,
      hasUnitCompletion: (unit) => completed.has(unit.id),
      resumeOrStart,
      replay,
      markPassed,
    }),
    [ready, passed, completed, resumeOrStart, replay, markPassed],
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
