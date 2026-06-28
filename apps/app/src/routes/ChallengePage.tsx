import { Navigate, useNavigate, useParams, useRouteLoaderData } from 'react-router'
import type { Unit } from '../types/domain'
import { ChallengeRenderer } from '../challenges/ChallengeRenderer'
import { useSession } from '../session/useSession'
import { PageShell } from '../components/PageShell'
import { BackLink } from '../components/BackLink'

export function ChallengePage() {
  const unit = useRouteLoaderData('unit') as Unit
  const { index: indexParam } = useParams()
  const navigate = useNavigate()
  const session = useSession()

  const index = Number(indexParam)
  const total = session.challenges.length
  const challenge =
    Number.isInteger(index) && index >= 0 ? session.challenges[index] : undefined

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
    <PageShell>
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <BackLink />
          <span className="font-display text-sm font-bold tabular-nums text-ink/60">
            {index + 1} / {total}
          </span>
        </div>
        {/* Hard-edged progress bar — boxed track, solid blue fill. */}
        <div className="h-3 w-full overflow-hidden rounded-none border-2 border-ink bg-canvas">
          <div
            className="h-full bg-bauhaus-blue transition-all duration-300 ease-out"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <h2 className="font-content text-sm font-bold text-ink/60">{unit.title}</h2>
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
    </PageShell>
  )
}
