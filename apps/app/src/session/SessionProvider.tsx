import { useCallback, useMemo, useState } from 'react'
import { Outlet } from 'react-router'

/** Per-unit practice session score, shared across the unit's challenge routes. */
export interface UnitSession {
  total: number
  answered: number
  correct: number
  record: (correct: boolean) => void
  reset: () => void
}

/**
 * Owns the in-memory score for one unit and exposes it to child routes via
 * React Router's `<Outlet context>`. Mounted with `key={unitId}` by the unit
 * layout, so switching units remounts a fresh 0/0 session. In-memory only —
 * a mid-unit refresh restarts the count (no progress persistence yet).
 */
export function SessionProvider({ total }: { total: number }) {
  const [answered, setAnswered] = useState(0)
  const [correct, setCorrect] = useState(0)

  const record = useCallback((isCorrect: boolean) => {
    setAnswered((n) => n + 1)
    if (isCorrect) setCorrect((n) => n + 1)
  }, [])

  const reset = useCallback(() => {
    setAnswered(0)
    setCorrect(0)
  }, [])

  const session = useMemo<UnitSession>(
    () => ({ total, answered, correct, record, reset }),
    [total, answered, correct, record, reset],
  )

  return <Outlet context={session} />
}
