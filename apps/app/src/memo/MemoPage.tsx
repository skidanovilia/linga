import { useState } from 'react'
import { Link, useLoaderData } from 'react-router'
import type { Unit } from '../types/domain'
import { MemoDeck, type MemoResultData } from './MemoDeck'

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
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 py-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <Link to="/units" className="hover:text-slate-900">
            ← Units
          </Link>
          <span>Memo cards</span>
        </div>
        <h2 className="text-sm font-medium text-slate-400">{unit.title}</h2>
      </header>

      <div className="mt-8 flex flex-1 flex-col">
        {unit.vocab.length === 0 ? (
          <p className="text-center text-slate-500">This unit has no vocabulary yet.</p>
        ) : result ? (
          <MemoResult result={result} onRestart={handleRestart} />
        ) : (
          <MemoDeck key={round} cards={unit.vocab} onComplete={setResult} />
        )}
      </div>
    </div>
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
      <div className="rounded-2xl border border-slate-200 bg-white px-10 py-8 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-slate-400">Memo complete</p>
        <div className="mt-4 flex items-center justify-center gap-8">
          <div>
            <p className="text-5xl font-bold tabular-nums text-green-600">{result.known}</p>
            <p className="mt-1 text-sm text-slate-500">Know</p>
          </div>
          <div>
            <p className="text-5xl font-bold tabular-nums text-red-600">{result.unknown}</p>
            <p className="mt-1 text-sm text-slate-500">Don't know</p>
          </div>
        </div>
        <p className="mt-4 text-slate-500">
          {result.unknown === 0 ? 'All known! 🎉' : `${total} cards reviewed`}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-700"
        >
          Restart
        </button>
        <Link
          to="/units"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium transition hover:border-slate-300"
        >
          Back to units
        </Link>
      </div>
    </div>
  )
}
