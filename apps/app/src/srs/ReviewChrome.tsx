import { Link } from 'react-router'
import type { ReviewSessionSummary } from '../lib/srs/session'
import { formatDue } from './formatDue'

/** Shared header for the scheduled-review screens. */
export function ReviewHeader({ unitTitle, label }: { unitTitle: string; label: string }) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <Link to="/units" className="hover:text-slate-900">
          ← Units
        </Link>
        <span>{label}</span>
      </div>
      <h2 className="text-sm font-medium text-slate-400">{unitTitle}</h2>
    </header>
  )
}

/**
 * The explicit "nothing due" state — not an error, not a refill. Shown when a
 * shelf has nothing due and no new items to introduce.
 */
export function ReviewEmptyState({ nextDueAt }: { nextDueAt: Date | null }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white px-10 py-8 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-slate-400">All reviewed</p>
        <p className="mt-3 text-lg font-medium">Nothing due right now 🎉</p>
        <p className="mt-1 text-slate-500">
          {nextDueAt ? `Next review ${formatDue(nextDueAt)}.` : 'No reviews scheduled.'}
        </p>
      </div>
      <Link
        to="/units"
        className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium transition hover:border-slate-300"
      >
        Back to units
      </Link>
    </div>
  )
}

/** End-of-session summary. */
export function ReviewSummary({
  summary,
  onRestart,
}: {
  summary: ReviewSessionSummary
  onRestart: () => void
}) {
  const allCorrect = summary.total > 0 && summary.correct === summary.total
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white px-10 py-8 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-slate-400">Session complete</p>
        <p className="mt-2 text-5xl font-bold tabular-nums">
          {summary.correct}
          <span className="text-slate-300"> / </span>
          {summary.total}
        </p>
        <p className="mt-3 text-slate-500">{allCorrect ? 'Perfect! 🎉' : 'Nice work!'}</p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-700"
        >
          Review again
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
