import { Link, Navigate, useNavigate, useParams, useRouteLoaderData } from 'react-router'
import type { Unit } from '../types/domain'
import { ChallengeRenderer } from '../challenges/ChallengeRenderer'
import { useSession } from '../session/useSession'

export function ChallengePage() {
  const unit = useRouteLoaderData('unit') as Unit
  const { index: indexParam } = useParams()
  const navigate = useNavigate()
  const session = useSession()

  const index = Number(indexParam)
  const total = unit.challenges.length
  const challenge =
    Number.isInteger(index) && index >= 0 ? unit.challenges[index] : undefined

  // Out-of-range / non-numeric index → jump to the result screen.
  if (!challenge) {
    return <Navigate to={`/units/${unit.id}/result`} replace />
  }

  const isLast = index === total - 1
  const handleNext = () => {
    navigate(
      isLast ? `/units/${unit.id}/result` : `/units/${unit.id}/challenge/${index + 1}`,
    )
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 py-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <Link to="/units" className="hover:text-slate-900">
            ← Units
          </Link>
          <span className="tabular-nums">
            {index + 1} / {total}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <h2 className="text-sm font-medium text-slate-400">{unit.title}</h2>
      </header>

      <div className="mt-8 flex flex-1 flex-col">
        {/* `key` resets the renderer's answer/status state on each challenge. */}
        <ChallengeRenderer
          key={index}
          challenge={challenge}
          onResult={session.record}
          onNext={handleNext}
        />
      </div>
    </div>
  )
}
