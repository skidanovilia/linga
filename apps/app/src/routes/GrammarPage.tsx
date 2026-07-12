import { useState } from 'react'
import { useLoaderData } from 'react-router'
import { Icon } from '@mdi/react'
import { mdiArrowRight, mdiRestore, mdiSwordCross } from '@mdi/js'
import type { Unit } from '../types/domain'
import { ReviewHeader } from '../srs/ReviewChrome'
import { Markdown } from '../components/Markdown'
import { PageShell } from '../components/PageShell'
import { Button, ButtonLink } from '../components/Button'
import { Card } from '../components/Card'

/**
 * Grammar section (`/units/:unitId/grammar`) — a stateless, read-only paged
 * markdown viewer. It uses neither the SRS nor the clear-the-queue engine and
 * persists nothing: `currentPage` lives only in local state, so it always starts
 * at page 1 and is always replayable. Pressing Next on the last page shows a
 * completion notice (not a page, not an error) offering Repeat and Challenges.
 */
export function GrammarPage() {
  const unit = useLoaderData() as Unit
  return (
    <PageShell>
      <ReviewHeader unitTitle={unit.title} label="Grammar" />
      <div className="mt-8 flex flex-1 flex-col">
        {/* Keyed on the unit so navigating between units resets to page 1. */}
        <GrammarSection key={unit.id} unit={unit} />
      </div>
    </PageShell>
  )
}

/** Holds the in-memory page position and switches between viewer and completion. */
function GrammarSection({ unit }: { unit: Unit }) {
  const pages = unit.grammar
  const total = pages.length
  const [page, setPage] = useState(0)
  const [done, setDone] = useState(false)

  // Reachable only when a section exists, but guard defensively.
  if (total === 0) return <GrammarEmptyState />
  if (done) {
    return (
      <GrammarComplete
        unitId={unit.id}
        onRepeat={() => {
          setPage(0)
          setDone(false)
        }}
      />
    )
  }

  const x = page + 1 // 1-based position
  const advance = () => (x < total ? setPage(x) : setDone(true))
  return <GrammarViewer content={pages[page]} x={x} total={total} onNext={advance} />
}

/** One page: position indicator + progress bar + markdown + Next. */
function GrammarViewer({
  content,
  x,
  total,
  onNext,
}: {
  content: string
  x: number
  total: number
  onNext: () => void
}) {
  const pct = (x / total) * 100
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-bold uppercase tracking-wide text-ink/60">Page</span>
          <span className="font-display text-sm font-bold tabular-nums text-ink/60">
            {x} / {total}
          </span>
        </div>
        {/* Bauhaus progress bar: hard-bordered track, blue fill = x / total. */}
        <div className="h-6 w-full rounded-none border-2 border-ink bg-muted md:border-4">
          <div
            className="h-full bg-bauhaus-blue transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Calm reading surface: thick border, no color block behind the text. */}
      <Card className="px-6 py-6">
        <Markdown>{content}</Markdown>
      </Card>

      <div className="mt-auto">
        <Button variant="yellow" className="w-full" onClick={onNext}>
          Next
          <Icon path={mdiArrowRight} size="1.25rem" />
        </Button>
      </div>
    </div>
  )
}

/** The completion notice — Repeat restarts from page 1; Challenges goes to the run. */
function GrammarComplete({ unitId, onRepeat }: { unitId: string; onRepeat: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Card decoration="blue" className="px-10 py-8">
        <p className="font-display text-sm font-bold uppercase tracking-widest text-ink/60">Grammar</p>
        <p className="mt-3 font-content text-lg font-bold">Section completed 🎉</p>
      </Card>
      <div className="flex gap-3">
        <Button variant="blue" onClick={onRepeat}>
          <Icon path={mdiRestore} size="1.25rem" />
          Repeat
        </Button>
        <ButtonLink to={`/units/${unitId}/challenges`} variant="outline">
          <Icon path={mdiSwordCross} size="1.25rem" />
          Challenges
        </ButtonLink>
      </div>
    </div>
  )
}

/** Guard state for a unit with no grammar pages (the button is normally hidden). */
function GrammarEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Card decoration="blue" className="px-10 py-8">
        <p className="font-display text-sm font-bold uppercase tracking-widest text-ink/60">No grammar</p>
        <p className="mt-3 font-content text-lg font-bold">This unit has no grammar section.</p>
      </Card>
      <ButtonLink to="/units" variant="outline">
        Back to units
      </ButtonLink>
    </div>
  )
}
