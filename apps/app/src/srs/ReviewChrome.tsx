import type { ReviewSessionSummary } from '../lib/srs/session'
import { formatDue } from './formatDue'
import { BackLink } from '../components/BackLink'
import { Button, ButtonLink } from '../components/Button'
import { Card } from '../components/Card'

/** Shared header for the scheduled-review screens. */
export function ReviewHeader({ unitTitle, label }: { unitTitle: string; label: string }) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <BackLink />
        <span className="font-display text-sm font-bold uppercase tracking-wide text-ink/60">{label}</span>
      </div>
      <h2 className="font-content text-sm font-bold text-ink/60">{unitTitle}</h2>
    </header>
  )
}

/**
 * The explicit "nothing to do" state — not an error, not a refill. Covers two
 * distinct cases that must not be confused: a shelf with nothing due and nothing
 * new left to introduce, and a unit that has no vocabulary in the first place.
 * Congratulating someone for clearing a shelf they never had reads as a bug.
 */
export function ReviewEmptyState({
  nextDueAt,
  hasVocab,
}: {
  nextDueAt: Date | null
  hasVocab: boolean
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Card decoration="blue" className="px-10 py-8">
        {hasVocab ? (
          <>
            <p className="font-display text-sm font-bold uppercase tracking-widest text-ink/60">All reviewed</p>
            <p className="mt-3 font-content text-lg font-bold">Nothing due right now 🎉</p>
            <p className="mt-1 font-content text-ink/70">
              {nextDueAt ? `Next review ${formatDue(nextDueAt)}.` : 'No reviews scheduled.'}
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-sm font-bold uppercase tracking-widest text-ink/60">No cards yet</p>
            <p className="mt-3 font-content text-lg font-bold">This unit has no vocabulary yet.</p>
            <p className="mt-1 font-content text-ink/70">Check back once words have been added.</p>
          </>
        )}
      </Card>
      <ButtonLink to="/units" variant="outline">
        Back to units
      </ButtonLink>
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
      <Card decoration="blue" className="px-10 py-8">
        <p className="font-display text-sm font-bold uppercase tracking-widest text-ink/60">Session complete</p>
        <p className="mt-2 font-display text-5xl font-black tabular-nums">
          <span className="text-bauhaus-blue">{summary.correct}</span>
          <span className="text-ink/30"> / </span>
          {summary.total}
        </p>
        <p className="mt-1 font-display text-xs font-bold uppercase tracking-wide text-ink/50">
          {summary.correct} correct · {summary.total - summary.correct} incorrect
        </p>
        <p className="mt-3 font-content text-ink/70">{allCorrect ? 'Perfect! 🎉' : 'Nice work!'}</p>
      </Card>
      <div className="flex gap-3">
        <Button variant="blue" onClick={onRestart}>
          Review again
        </Button>
        <ButtonLink to="/units" variant="outline">
          Back to units
        </ButtonLink>
      </div>
    </div>
  )
}
