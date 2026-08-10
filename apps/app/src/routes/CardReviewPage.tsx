import { useLoaderData } from 'react-router'
import type { Unit, VocabEntry } from '../types/domain'
import { cardAdapter } from '../srs/adapters'
import { useReviewSession } from '../srs/useReviewSession'
import { CardReviewDeck } from '../srs/CardReviewDeck'
import { ReviewEmptyState, ReviewHeader, ReviewSummary } from '../srs/ReviewChrome'
import { Loading } from './Loading'
import { PageShell } from '../components/PageShell'

/**
 * The unit's one card screen (`/units/:unitId/review/cards`), in whichever of its
 * two modes the shelf calls for: an introduction of the words never met, or the
 * gated review of what the scheduler wants back. The hook decides — the route
 * carries no flag — so arriving here directly is governed by exactly the rule the
 * unit card's button shows, and a shelf whose lowest box has not fully ripened
 * lands on the "nothing due" state rather than a session.
 *
 * The deck itself is driven by the spaced-repetition engine: a right swipe grades
 * the card correct (promote), a left swipe wrong (drop to box 1 + requeue this
 * session). Only these scheduled answers move the shelf — the free-practice memo
 * deck never does.
 */
export function CardReviewPage() {
  const unit = useLoaderData() as Unit
  const review = useReviewSession<VocabEntry>(cardAdapter, unit)

  const handleSwipe = (correct: boolean) => {
    review.answer(correct)
    review.advance()
  }

  return (
    <PageShell>
      <ReviewHeader
        unitTitle={unit.title}
        label={review.mode === 'introduce' ? 'Learn new words' : 'Review cards'}
      />

      <div className="mt-8 flex flex-1 flex-col">
        {review.error ? (
          <p className="text-center font-content font-bold text-bauhaus-red">{review.error}</p>
        ) : review.phase === 'loading' ? (
          <Loading />
        ) : review.phase === 'empty' ? (
          <ReviewEmptyState nextDueAt={review.availableAt} hasVocab={unit.vocab.length > 0} />
        ) : review.phase === 'done' && review.summary ? (
          <ReviewSummary
            summary={review.summary}
            onRestart={review.restart}
            // Exactly the gate, asked of the shelf this run ended on: `enabled`
            // now means "review can be entered", which is the question this prop
            // is. `dueCount > 0` would be too loose — a wrong answer just dropped
            // an item into box 1 due a minute out, so items are due while the
            // lowest box is not yet fully ripe and re-entry must wait.
            canRepeat={review.outcome?.enabled ?? false}
            nextDueAt={review.outcome?.availableAt ?? null}
          />
        ) : review.item ? (
          <CardReviewDeck
            current={{
              id: review.item.content.id,
              front: review.item.content.ru,
              back: review.item.content.ka,
            }}
            upcoming={
              review.upcoming
                ? {
                    id: review.upcoming.content.id,
                    front: review.upcoming.content.ru,
                    back: review.upcoming.content.ka,
                  }
                : null
            }
            index={review.index}
            total={review.total}
            onAnswer={handleSwipe}
          />
        ) : null}
      </div>
    </PageShell>
  )
}
