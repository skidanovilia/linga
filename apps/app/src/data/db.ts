import type { LoaderFunctionArgs } from 'react-router'
import type { Challenge, Unit } from '../types/domain'
import unitsData from './units.json'

// The bundled JSON acts as our read-only "database" for now. Funnelling every
// read through this module keeps the source swappable: to move to a real API
// later, make these functions `async` (fetch(...)) and `await` them in the
// loaders below — pages and components stay untouched.
const units = unitsData as unknown as Unit[]

export function getUnits(): Unit[] {
  return units
}

export function getUnit(id: string): Unit | undefined {
  return units.find((unit) => unit.id === id)
}

export function getChallenge(unitId: string, index: number): Challenge | undefined {
  return getUnit(unitId)?.challenges[index]
}

// --- React Router loaders -------------------------------------------------

export function unitsLoader(): Unit[] {
  return getUnits()
}

export function unitLoader({ params }: LoaderFunctionArgs): Unit {
  const unit = getUnit(params.unitId ?? '')
  if (!unit) {
    throw new Response('Unit not found', { status: 404 })
  }
  return unit
}
