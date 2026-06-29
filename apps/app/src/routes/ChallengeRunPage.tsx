import { useLoaderData } from 'react-router'
import type { Unit } from '../types/domain'
import { ChallengeRenderer } from '../challenges/ChallengeRenderer'
import { useChallengeRun } from '../challenges/run/useChallengeRun'
import { ReviewHeader } from '../srs/ReviewChrome'
import { Loading } from './Loading'
import { PageShell } from '../components/PageShell'
import { Button, ButtonLink } from '../components/Button'
import { Card } from '../components/Card'

/**
 * Challenge run (`/units/:unitId/challenges`) — the clear-the-queue engine. The
 * module's not-passed challenges are shuffled into a queue; the shared renderer
 * checks each answer, a correct one clears it (and persists it as passed), a
 * wrong one re-queues it later (persisting nothing). When the queue empties the
 * module is complete (derived from all challenges being passed) and a completion
 * screen offers a replay that resets the module. There is no SRS box/due here;
 * only the per-item passed rows persist, so re-entry resumes where you left off.
 */
export function ChallengeRunPage() {
  const unit = useLoaderData() as Unit
  const run = useChallengeRun(unit)

  return (
    <PageShell>
      <ReviewHeader
        unitTitle={unit.title}
        label={`Challenges${run.total > 0 ? ` · ${run.cleared} / ${run.total}` : ''}`}
      />

      <div className="mt-8 flex flex-1 flex-col">
        {run.phase === 'loading' ? (
          <Loading />
        ) : run.phase === 'empty' ? (
          <ChallengeEmptyState />
        ) : run.phase === 'done' ? (
          <ChallengeComplete onReplay={run.restart} />
        ) : run.challenge ? (
          <ChallengeRenderer
            // Key by presentation step so the renderer resets per challenge.
            key={run.step}
            challenge={run.challenge}
            onResult={run.answer}
            onNext={run.advance}
          />
        ) : null}
      </div>
    </PageShell>
  )
}

/** Shown when a module has no challenges to clear. */
function ChallengeEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Card decoration="blue" className="px-10 py-8">
        <p className="font-display text-sm font-bold uppercase tracking-widest text-ink/60">No challenges</p>
        <p className="mt-3 font-content text-lg font-bold">This module has no challenges yet.</p>
      </Card>
      <ButtonLink to="/units" variant="outline">
        Back to units
      </ButtonLink>
    </div>
  )
}

/** The cleared-queue screen: the module is now completed and replayable. */
function ChallengeComplete({ onReplay }: { onReplay: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Card decoration="red" className="bg-bauhaus-yellow px-10 py-8">
        <p className="font-display text-sm font-bold uppercase tracking-widest text-ink/60">Module complete</p>
        <p className="mt-3 font-content text-lg font-bold">Queue cleared! 🎉</p>
      </Card>
      <div className="flex gap-3">
        <Button variant="blue" onClick={onReplay}>
          Replay
        </Button>
        <ButtonLink to="/units" variant="outline">
          Back to units
        </ButtonLink>
      </div>
    </div>
  )
}
