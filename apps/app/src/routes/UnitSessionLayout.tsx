import { useLoaderData, useParams } from 'react-router'
import type { Unit } from '../types/domain'
import { SessionProvider } from '../session/SessionProvider'

/**
 * Layout route for `/units/:unitId`. It loads the unit and mounts a fresh
 * `SessionProvider` per unit (via `key={unitId}`). The provider renders the
 * child `<Outlet>`, so the layout stays mounted while the user moves between
 * `challenge/0 → challenge/1 → … → result`, accumulating the score.
 */
export function UnitSessionLayout() {
  const unit = useLoaderData() as Unit
  const { unitId } = useParams()

  return <SessionProvider key={unitId} total={unit.challenges.length} />
}
