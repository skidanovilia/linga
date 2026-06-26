import { Link, useNavigate, useRouteLoaderData } from 'react-router'
import type { Unit } from '../types/domain'
import { useSession } from '../session/useSession'

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
    <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <h1 className="text-2xl font-bold">{unit.title}</h1>

      <div className="rounded-2xl border border-slate-200 bg-white px-10 py-8 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-slate-400">Result</p>
        <p className="mt-2 text-5xl font-bold tabular-nums">
          {correct}
          <span className="text-slate-300"> / </span>
          {total}
        </p>
        <p className="mt-3 text-slate-500">
          {allCorrect ? 'Perfect! 🎉' : 'Keep practicing!'}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleRestart}
          className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-700"
        >
          Restart unit
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
