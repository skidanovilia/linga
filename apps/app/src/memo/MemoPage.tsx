import { useState } from 'react'
import { useLoaderData } from 'react-router'
import type { Unit } from '../types/domain'
import { MemoDeck, type MemoResultData } from './MemoDeck'
import { PageShell } from '../components/PageShell'
import { BackLink } from '../components/BackLink'
import { Button, ButtonLink } from '../components/Button'
import { Card } from '../components/Card'

/**
 * The memo-cards route (`/units/:unitId/memo`). Runs independently of the
 * challenge session: it shows the unit's vocab as a swipeable deck and, once
 * the deck is done, a result screen with the known/unknown tallies.
 */
export function MemoPage() {
  const unit = useLoaderData() as Unit
  const [result, setResult] = useState<MemoResultData | null>(null)
  // Bumping this remounts the deck (fresh shuffle + reset) on restart.
  const [round, setRound] = useState(0)

  const handleRestart = () => {
    setResult(null)
    setRound((r) => r + 1)
  }

  return (
    <PageShell>
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <BackLink />
          <span className="font-display text-sm font-bold uppercase tracking-wide text-ink/60">
            Memo cards
          </span>
        </div>
        <h2 className="font-content text-sm font-bold text-ink/60">{unit.title}</h2>
      </header>

      <div className="mt-8 flex flex-1 flex-col">
        {unit.vocab.length === 0 ? (
          <p className="text-center font-content text-ink/60">This unit has no vocabulary yet.</p>
        ) : result ? (
          <MemoResult result={result} onRestart={handleRestart} />
        ) : (
          <MemoDeck key={round} cards={unit.vocab} onComplete={setResult} />
        )}
      </div>
    </PageShell>
  )
}

interface MemoResultProps {
  result: MemoResultData
  onRestart: () => void
}

function MemoResult({ result, onRestart }: MemoResultProps) {
  const total = result.known + result.unknown
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <Card decoration="blue" className="px-10 py-8">
        <p className="font-display text-sm font-bold uppercase tracking-widest text-ink/60">
          Memo complete
        </p>
        <div className="mt-4 flex items-center justify-center gap-8">
          <div>
            <p className="font-display text-5xl font-black tabular-nums text-bauhaus-green">
              {result.known}
            </p>
            <p className="mt-1 font-display text-sm font-bold uppercase tracking-wide text-ink/60">
              Know
            </p>
          </div>
          <div>
            <p className="font-display text-5xl font-black tabular-nums text-bauhaus-red">
              {result.unknown}
            </p>
            <p className="mt-1 font-display text-sm font-bold uppercase tracking-wide text-ink/60">
              Don't know
            </p>
          </div>
        </div>
        <p className="mt-4 font-content text-ink/70">
          {result.unknown === 0 ? 'All known! 🎉' : `${total} cards reviewed`}
        </p>
      </Card>

      <div className="flex gap-3">
        <Button variant="blue" onClick={onRestart}>
          Restart
        </Button>
        <ButtonLink to="/units" variant="outline">
          Back to units
        </ButtonLink>
      </div>
    </div>
  )
}
