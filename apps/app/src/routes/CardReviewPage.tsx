import { useLoaderData } from 'react-router'
import type { Unit, VocabEntry } from '../types/domain'
import { cardAdapter } from '../srs/adapters'
import { useReviewSession } from '../srs/useReviewSession'
import { CardReviewDeck } from '../srs/CardReviewDeck'
import { ReviewEmptyState, ReviewHeader, ReviewSummary } from '../srs/ReviewChrome'
import { Loading } from './Loading'
import { PageShell } from '../components/PageShell'

/**
 * Scheduled card review (`/units/:unitId/review/cards`). The deck is driven by
 * the spaced-repetition engine: a right swipe grades the card correct (promote),
 * a left swipe wrong (drop to box 1 + requeue this session). Only these
 * scheduled answers move the shelf — the free-practice memo deck never does.
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
      <ReviewHeader unitTitle={unit.title} label="Review cards" />

      <div className="mt-8 flex flex-1 flex-col">
        {review.error ? (
          <p className="text-center font-content font-bold text-bauhaus-red">{review.error}</p>
        ) : review.phase === 'loading' ? (
          <Loading />
        ) : review.phase === 'empty' ? (
          <ReviewEmptyState nextDueAt={review.nextDueAt} />
        ) : review.phase === 'done' && review.summary ? (
          <ReviewSummary summary={review.summary} onRestart={review.restart} />
        ) : review.item ? (
          <CardReviewDeck
            current={review.item.content}
            upcoming={review.upcoming?.content ?? null}
            index={review.index}
            total={review.total}
            onAnswer={handleSwipe}
          />
        ) : null}
      </div>
    </PageShell>
  )
}
