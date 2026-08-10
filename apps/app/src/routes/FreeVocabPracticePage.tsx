import { useLoaderData } from 'react-router'
import type { Unit } from '../types/domain'
import { useVocabPracticeSession } from '../srs/useVocabPracticeSession'
import { CardReviewDeck } from '../srs/CardReviewDeck'
import { ReviewSummary } from '../srs/ReviewChrome'
import { Loading } from './Loading'
import { PageShell } from '../components/PageShell'
import { BackLink } from '../components/BackLink'
import { ButtonLink } from '../components/Button'
import { Card } from '../components/Card'

/**
 * Free vocabulary practice (`/practice/vocab`) — a cross-unit shuffle game.
 * Unlike `CardReviewPage`, there's no scheduled shelf here: the pool and order
 * are decided fresh each session, every card is prompted Georgian-side up, and
 * nothing is persisted — swiping never touches box/due state or `vocab_progress`.
 */
export function FreeVocabPracticePage() {
  const units = useLoaderData() as Unit[]
  const session = useVocabPracticeSession(units)

  const handleSwipe = (correct: boolean) => {
    session.answer(correct)
    session.advance()
  }

  return (
    <PageShell>
      <header className="flex items-center justify-between">
        <BackLink />
        <span className="font-display text-sm font-bold uppercase tracking-wide text-ink/60">
          Free practice
        </span>
      </header>

      <div className="mt-8 flex flex-1 flex-col">
        {session.error ? (
          <p className="text-center font-content font-bold text-bauhaus-red">{session.error}</p>
        ) : session.phase === 'loading' ? (
          <Loading />
        ) : session.phase === 'empty' ? (
          <VocabPracticeEmptyState />
        ) : session.phase === 'done' && session.summary ? (
          <ReviewSummary summary={session.summary} onRestart={session.restart} />
        ) : session.current ? (
          <CardReviewDeck
            current={session.current}
            upcoming={session.upcoming}
            index={session.index}
            total={session.total}
            onAnswer={handleSwipe}
          />
        ) : null}
      </div>
    </PageShell>
  )
}

/** Shown when no vocab item has any memo progress yet (AC3's pool-of-0 case). */
function VocabPracticeEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Card decoration="blue" className="px-10 py-8">
        <p className="font-display text-sm font-bold uppercase tracking-widest text-ink/60">
          Nothing to practice yet
        </p>
        <p className="mt-3 font-content text-ink/70">
          Review some cards first, then come back to shuffle everything you know.
        </p>
      </Card>
      <ButtonLink to="/units" variant="outline">
        Back to units
      </ButtonLink>
    </div>
  )
}
