import { useCallback, useMemo, useState } from 'react'
import { Outlet } from 'react-router'
import type { Challenge } from '../types/domain'
import { shuffle } from '../lib/shuffle'
import { RUN_SIZE } from '../config'

/** Per-unit practice session: the run's challenges plus the running score. */
export interface UnitSession {
  /** The shuffled, capped challenges for this run (what the pages iterate). */
  challenges: Challenge[]
  total: number
  answered: number
  correct: number
  record: (correct: boolean) => void
  reset: () => void
}

/**
 * Owns one unit's run and exposes it to child routes via React Router's
 * `<Outlet context>`. The unit's challenges are shuffled and capped to
 * `RUN_SIZE.challenges` once per run, so the same subset is used across
 * `challenge/0 → challenge/1 → … → result`. Mounted with `key={unitId}` by the
 * unit layout, so switching units starts a fresh run; `reset()` reshuffles a new
 * run for the same unit. In-memory only — a mid-run refresh restarts it.
 */
export function SessionProvider({ challenges: allChallenges }: { challenges: Challenge[] }) {
  // Bumped by reset() to reshuffle a fresh run without remounting.
  const [round, setRound] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [correct, setCorrect] = useState(0)

  const challenges = useMemo(
    () => shuffle(allChallenges).slice(0, RUN_SIZE.challenges),
    // `round` is an intentional reshuffle trigger.
    [allChallenges, round],
  )
  const total = challenges.length

  const record = useCallback((isCorrect: boolean) => {
    setAnswered((n) => n + 1)
    if (isCorrect) setCorrect((n) => n + 1)
  }, [])

  const reset = useCallback(() => {
    setAnswered(0)
    setCorrect(0)
    setRound((r) => r + 1)
  }, [])

  const session = useMemo<UnitSession>(
    () => ({ challenges, total, answered, correct, record, reset }),
    [challenges, total, answered, correct, record, reset],
  )

  return <Outlet context={session} />
}
