import type { VocabEntry } from '../types/domain'
import { MemoCard } from '../memo/MemoCard'
import { ActiveCard } from '../memo/MemoDeck'

interface CardReviewDeckProps {
  current: VocabEntry
  /** The next card, shown faded behind the active one. */
  upcoming: VocabEntry | null
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
            <MemoCard front={upcoming.ru} back={upcoming.ka} flipped={false} />
          </div>
        )}
        {/* Key by id + position so a requeued card remounts with fresh state. */}
        <ActiveCard
          key={`${index}-${current.id}`}
          entry={current}
          onSwipe={(direction) => onAnswer(direction > 0)}
        />
      </div>
      <p className="text-center text-sm tabular-nums text-slate-400">
        {index} / {total}
      </p>
    </div>
  )
}
