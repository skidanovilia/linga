import { MemoCard } from './MemoCard'
import { ActiveCard } from './ActiveCard'

/** A card's content, already resolved to which side shows first. */
export interface DeckCard {
  id: string
  front: string
  back: string
}

interface CardReviewDeckProps {
  current: DeckCard
  /** The next card, shown faded behind the active one. */
  upcoming: DeckCard | null
  index: number
  total: number
  /** Swipe right = "know" (correct), left = "don't know" (wrong). */
  onAnswer: (correct: boolean) => void
}

/**
 * Engine-driven swipe deck: it renders only the current (and a peek of the next)
 * card — the queue, ordering, and same-session requeue all live in the review
 * session, not here. A swipe reports correct/wrong and the parent advances.
 */
export function CardReviewDeck({
  current,
  upcoming,
  index,
  total,
  onAnswer,
}: CardReviewDeckProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="relative h-80 w-full">
        {upcoming && (
          <div className="absolute inset-0 z-0 scale-95 opacity-60">
            <MemoCard front={upcoming.front} back={upcoming.back} flipped={false} elevated={false} />
          </div>
        )}
        {/* Key by id + position so a requeued card remounts with fresh state. */}
        <ActiveCard
          key={`${index}-${current.id}`}
          front={current.front}
          back={current.back}
          onSwipe={(direction) => onAnswer(direction > 0)}
        />
      </div>
      <p className="text-center font-display text-sm tabular-nums text-ink/50">
        {index} / {total}
      </p>
    </div>
  )
}
