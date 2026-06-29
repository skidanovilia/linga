import { useEffect, useState } from 'react'
import type { Unit } from '../types/domain'
import { leitnerStrategy } from '../lib/srs/leitner'
import { summarizeShelf, type ShelfStatus } from '../lib/srs/shelf'
import { toReviewItems } from '../lib/srs/store'
import { useAuth } from '../auth/useAuth'
import { cardAdapter } from './adapters'

/**
 * Per-unit card launch state for the units list — derived from the SRS engine,
 * never tracked, so the button can never disagree with the scheduler. Loads the
 * user's card progress once, then summarises each unit. Returns `null` while
 * loading or when signed out. (Challenges are not SRS; their entry state comes
 * from the challenge run provider, not here.)
 */
export function useShelfStatus(units: Unit[]): Map<string, ShelfStatus> | null {
  const { user } = useAuth()
  const userId = user?.id
  const [status, setStatus] = useState<Map<string, ShelfStatus> | null>(null)

  useEffect(() => {
    if (!userId) {
      setStatus(null)
      return
    }
    let active = true
    const cardStore = cardAdapter.createStore(userId)
    const vocabIds = units.flatMap((u) => u.vocab.map((v) => v.id))

    cardStore
      .loadProgress(vocabIds)
      .then((vocabProgress) => {
        if (!active) return
        const now = new Date()
        const map = new Map<string, ShelfStatus>()
        for (const unit of units) {
          const cardItems = toReviewItems(cardAdapter.loadItems(unit), vocabProgress)
          map.set(unit.id, summarizeShelf(cardItems, leitnerStrategy, now))
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
