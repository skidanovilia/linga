import { useNavigate, useRouteLoaderData } from 'react-router'
import type { Unit } from '../types/domain'
import { useSession } from '../session/useSession'
import { PageShell } from '../components/PageShell'
import { Button, ButtonLink } from '../components/Button'
import { Card } from '../components/Card'

export function ResultPage() {
  const unit = useRouteLoaderData('unit') as Unit
  const navigate = useNavigate()
  const session = useSession()

  const { correct, total } = session
  const allCorrect = total > 0 && correct === total

  const handleRestart = () => {
    session.reset()
    navigate(`/units/${unit.id}/challenge/0`)
  }

  return (
    <PageShell center className="gap-6 py-10 text-center">
      <h1 className="font-content text-2xl font-bold">{unit.title}</h1>

      {/* A perfect run earns the celebratory yellow color-block. */}
      <Card
        decoration={allCorrect ? 'red' : 'blue'}
        className={`px-10 py-8 ${allCorrect ? 'bg-bauhaus-yellow' : ''}`}
      >
        <p className="font-display text-sm font-bold uppercase tracking-widest text-ink/60">Result</p>
        <p className="mt-2 font-display text-6xl font-black tabular-nums">
          <span className={allCorrect ? 'text-ink' : 'text-bauhaus-blue'}>{correct}</span>
          <span className="text-ink/30"> / </span>
          {total}
        </p>
        <p className="mt-3 font-content text-ink/70">
          {allCorrect ? 'Perfect! 🎉' : 'Keep practicing!'}
        </p>
      </Card>

      <div className="flex gap-3">
        <Button variant="blue" onClick={handleRestart}>
          Restart unit
        </Button>
        <ButtonLink to="/units" variant="outline">
          Back to units
        </ButtonLink>
      </div>
    </PageShell>
  )
}
