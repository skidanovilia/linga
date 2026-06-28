import { useEffect, useState } from 'react'
import type { Unit } from '../types/domain'
import { leitnerStrategy } from '../lib/srs/leitner'
import { summarizeShelf, type ShelfStatus } from '../lib/srs/shelf'
import { toReviewItems } from '../lib/srs/store'
import { useAuth } from '../auth/useAuth'
import { cardAdapter, challengeAdapter } from './adapters'

export interface UnitShelves {
  cards: ShelfStatus
  challenges: ShelfStatus
}

/**
 * Per-unit, per-kind launch state for the units list — derived from the engine,
 * never tracked, so a button can never disagree with the scheduler. Loads the
 * user's progress for both shelves once, then summarises each unit. Returns
 * `null` while loading or when signed out.
 */
export function useShelfStatus(units: Unit[]): Map<string, UnitShelves> | null {
  const { user } = useAuth()
  const userId = user?.id
  const [status, setStatus] = useState<Map<string, UnitShelves> | null>(null)

  useEffect(() => {
    if (!userId) {
      setStatus(null)
      return
    }
    let active = true
    const cardStore = cardAdapter.createStore(userId)
    const challengeStore = challengeAdapter.createStore(userId)
    const vocabIds = units.flatMap((u) => u.vocab.map((v) => v.id))
    const challengeIds = units.flatMap((u) => u.challenges.map((c) => c.id))

    Promise.all([
      cardStore.loadProgress(vocabIds),
      challengeStore.loadProgress(challengeIds),
    ])
      .then(([vocabProgress, challengeProgress]) => {
        if (!active) return
        const now = new Date()
        const map = new Map<string, UnitShelves>()
        for (const unit of units) {
          const cardItems = toReviewItems(cardAdapter.loadItems(unit), vocabProgress)
          const challengeItems = toReviewItems(
            challengeAdapter.loadItems(unit),
            challengeProgress,
          )
          map.set(unit.id, {
            cards: summarizeShelf(cardItems, leitnerStrategy, now),
            challenges: summarizeShelf(challengeItems, leitnerStrategy, now),
          })
        }
        setStatus(map)
      })
      .catch(() => {
        if (active) setStatus(null)
      })

    return () => {
      active = false
    }
  }, [units, userId])

  return status
}
