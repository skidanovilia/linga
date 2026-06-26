import { useOutletContext } from 'react-router'
import type { UnitSession } from './SessionProvider'

/** Typed access to the current unit's session score (from the unit layout). */
export function useSession(): UnitSession {
  return useOutletContext<UnitSession>()
}
