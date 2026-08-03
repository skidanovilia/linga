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

    // 3. Every new item — no trickle, no session cap. A unit's session is its
    //    whole outstanding workload, so a brand-new unit introduces all of its
    //    vocabulary at once instead of rationing it five words per launch.
    //
    // Failures stay up front; the rest of the due work is interleaved with the
    // new items so concepts vary and new cards don't clump at the tail.
    const queue = [...failures, ...interleave(overdue, fresh)].map((i) => i.id)

    // Nothing is ever pulled forward — an item that is not due stays out of the
    // session — so the nearest future item is exactly what's waiting. This is
    // what keeps a finished shelf empty ("all reviewed") rather than refilling
    // it with cards answered correctly minutes ago.
    const nextDueAt = future[0]?.state?.dueAt ?? null

    return {
      queue,
      counts: {
        failures: failures.length,
        overdue: overdue.length,
        fresh: fresh.length,
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
