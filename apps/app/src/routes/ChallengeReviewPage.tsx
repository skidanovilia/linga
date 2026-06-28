import { useLoaderData } from 'react-router'
import type { Challenge, Unit } from '../types/domain'
import { ChallengeRenderer } from '../challenges/ChallengeRenderer'
import { challengeAdapter } from '../srs/adapters'
import { useReviewSession } from '../srs/useReviewSession'
import { ReviewEmptyState, ReviewHeader, ReviewSummary } from '../srs/ReviewChrome'
import { Loading } from './Loading'

/**
 * Scheduled challenge review (`/units/:unitId/review/challenges`). The engine
 * picks and orders the queue; this page just renders the current challenge via
 * the shared renderer and reports its result. Check → grade (promote/demote),
 * Next → advance. Type is irrelevant to scheduling — it only chooses the
 * renderer. The free-practice challenge run never moves the shelf.
 */
export function ChallengeReviewPage() {
  const unit = useLoaderData() as Unit
  const review = useReviewSession<Challenge>(challengeAdapter, unit)

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 py-6">
      <ReviewHeader unitTitle={unit.title} label={`Review challenges · ${reviewCount(review.index, review.total)}`} />

      <div className="mt-8 flex flex-1 flex-col">
        {review.error ? (
          <p className="text-center text-red-600">{review.error}</p>
        ) : review.phase === 'loading' ? (
          <Loading />
        ) : review.phase === 'empty' ? (
          <ReviewEmptyState nextDueAt={review.nextDueAt} />
        ) : review.phase === 'done' && review.summary ? (
          <ReviewSummary summary={review.summary} onRestart={review.restart} />
        ) : review.item ? (
          <ChallengeRenderer
            // Key by position so the renderer resets answer/status per challenge.
            key={review.index}
            challenge={review.item.content}
            onResult={review.answer}
            onNext={review.advance}
          />
        ) : null}
      </div>
    </div>
  )
}

const reviewCount = (index: number, total: number) => (total > 0 ? `${index} / ${total}` : '')
