// The Leitner strategy: one concrete implementation of `ReviewStrategy`. It is
// pure — every method is a function of its arguments and the injected config,
// with the clock passed in as `now` — so the whole scheduler is deterministically
// testable. No `Date.now()`, no `Math.random()` here.

import { SRS } from '../../config'
import type {
  BuildSessionOptions,
  ProgressState,
  ReviewItem,
  ReviewStrategy,
  SessionPlan,
} from './types'

/** The knobs the Leitner math reads. `SRS` from `config.ts` satisfies this. */
export interface LeitnerConfig {
  boxIntervals: readonly number[]
  maxBox: number
  wrongShortInterval: number
  sessionSize: number
  newPerSession: number
  failureCap: number
}

const ms = (date: Date) => date.getTime()
const addMs = (now: Date, delta: number) => new Date(ms(now) + delta)

export function createLeitnerStrategy(config: LeitnerConfig = SRS): ReviewStrategy {
  const intervalFor = (box: number) => {
    const i = Math.min(Math.max(box, 1), config.maxBox) - 1
    return config.boxIntervals[i]
  }

  const isNew = (state: ProgressState | null): boolean => state === null

  const isDue = (state: ProgressState | null, now: Date): boolean =>
    state !== null && state.box >= 1 && ms(state.dueAt) <= ms(now)

  const grade = (
    state: ProgressState | null,
    correct: boolean,
    now: Date,
  ): ProgressState => {
    const prevBox = state?.box ?? 0
    const reps = (state?.reps ?? 0) + 1
    const lapses = state?.lapses ?? 0

    if (correct) {
      const box = Math.min(prevBox + 1, config.maxBox)
      return {
        box,
        dueAt: addMs(now, intervalFor(box)),
        reps,
        lapses,
        lastResult: 'correct',
        lastSeenAt: now,
      }
    }

    // Wrong: drop to box 1, reschedule soon, and count a lapse. The same-session
    // re-insertion is the session controller's job, not the state transition's.
    return {
      box: 1,
      dueAt: addMs(now, config.wrongShortInterval),
      reps,
      lapses: lapses + 1,
      lastResult: 'wrong',
      lastSeenAt: now,
    }
  }

  const buildSession = (
    items: ReviewItem[],
    { now }: BuildSessionOptions,
  ): SessionPlan => {
    const due = items.filter((i) => isDue(i.state, now))
    const fresh = items.filter((i) => i.state === null) // content order preserved
    const future = items
      .filter((i) => i.state !== null && !isDue(i.state, now))
      .sort((a, b) => ms(a.state!.dueAt) - ms(b.state!.dueAt))

    // 1. Recent failures lead — most-recently-seen first, capped.
    const failures = due
      .filter((i) => i.state!.lastResult === 'wrong')
      .sort((a, b) => lastSeen(b) - lastSeen(a))
      .slice(0, config.failureCap)
    const failureIds = new Set(failures.map((i) => i.id))

    // 2. The rest of the due items, most overdue (earliest due_at) first.
    const overdue = due
      .filter((i) => !failureIds.has(i.id))
      .sort((a, b) => ms(a.state!.dueAt) - ms(b.state!.dueAt))

    // Fill to the session cap, bucket by bucket.
    let room = config.sessionSize
    const pickedFailures = take(failures, room)
    room -= pickedFailures.length
    const pickedOverdue = take(overdue, room)
    room -= pickedOverdue.length
    // 3. New items: the strict trickle — the primary pile-up guard.
    const pickedFresh = take(fresh, Math.min(config.newPerSession, room))
    room -= pickedFresh.length
    // 4. Top up a thin session with the nearest-future items — but only once
    //    there is real due work AND nothing new is left to learn. This keeps two
    //    promises: a shelf with nothing due/new stays empty ("all reviewed", not
    //    a refill), and a just-finished perfect pass is never re-served while new
    //    content still exists.
    const hasDueWork = pickedFailures.length + pickedOverdue.length > 0
    const canTopUp = hasDueWork && fresh.length === 0
    const pickedFuture = canTopUp ? take(future, room) : []

    // Failures stay up front; interleave the remaining reviews with the new
    // trickle so concepts vary and new cards don't clump at the tail.
    const reviewsTail = [...pickedOverdue, ...pickedFuture]
    const body = interleave(reviewsTail, pickedFresh)
    const queue = [...pickedFailures, ...body].map((i) => i.id)

    const queued = new Set(queue)
    const waiting = future.find((i) => !queued.has(i.id))
    const nextDueAt = waiting ? waiting.state!.dueAt : null

    return {
      queue,
      counts: {
        failures: pickedFailures.length,
        overdue: pickedOverdue.length,
        fresh: pickedFresh.length,
        future: pickedFuture.length,
      },
      nextDueAt,
    }
  }

  return { isNew, isDue, grade, buildSession }
}

/** The shared default instance both shelves use. */
export const leitnerStrategy = createLeitnerStrategy()

// --- helpers ---------------------------------------------------------------

const lastSeen = (item: ReviewItem): number => item.state?.lastSeenAt?.getTime() ?? 0

const take = <T>(xs: T[], n: number): T[] => (n <= 0 ? [] : xs.slice(0, n))

/**
 * Merge `secondary` items evenly into `primary`, preserving each list's order.
 * Deterministic (no randomness) so sessions are reproducible: a secondary item
 * lands roughly every `total / secondary.length` slots.
 */
function interleave<T>(primary: T[], secondary: T[]): T[] {
  if (secondary.length === 0) return [...primary]
  if (primary.length === 0) return [...secondary]

  const total = primary.length + secondary.length
  const gap = total / secondary.length
  const out: T[] = []
  let pi = 0
  let si = 0
  let nextSecondary = gap - 1

  for (let pos = 0; pos < total; pos++) {
    const placeSecondary =
      si < secondary.length && (pi >= primary.length || pos >= Math.floor(nextSecondary))
    if (placeSecondary) {
      out.push(secondary[si++])
      nextSecondary += gap
    } else {
      out.push(primary[pi++])
    }
  }
  return out
}
