import { useMemo, useState } from 'react'
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import type { VocabEntry } from '../types/domain'
import { shuffle } from '../lib/shuffle'
import { RUN_SIZE } from '../config'
import { MemoCard } from './MemoCard'

export interface MemoResultData {
  known: number
  unknown: number
}

interface MemoDeckProps {
  cards: VocabEntry[]
  /** Called once when the last card has been swiped away. */
  onComplete: (result: MemoResultData) => void
}

/** Past this horizontal offset (px) or pointer velocity, a release commits a swipe. */
const SWIPE_OFFSET = 120
const SWIPE_VELOCITY = 500

/**
 * The swipeable memo deck. Cards are shuffled once per mount. The top card is
 * draggable: releasing past the threshold to the right counts as "know" (green)
 * and to the left as "don't know" (red); a smaller drag springs back. The next
 * card sits behind the active one so there's always a card underneath. When the
 * deck runs out, `onComplete` reports the tallies.
 */
export function MemoDeck({ cards, onComplete }: MemoDeckProps) {
  const deck = useMemo(() => shuffle(cards).slice(0, RUN_SIZE.vocab), [cards])
  const [index, setIndex] = useState(0)
  const [known, setKnown] = useState(0)
  const [unknown, setUnknown] = useState(0)

  const handleSwipe = (direction: number) => {
    const nextKnown = known + (direction > 0 ? 1 : 0)
    const nextUnknown = unknown + (direction < 0 ? 1 : 0)
    setKnown(nextKnown)
    setUnknown(nextUnknown)
    if (index + 1 >= deck.length) {
      onComplete({ known: nextKnown, unknown: nextUnknown })
    } else {
      setIndex(index + 1)
    }
  }

  const current = deck[index]
  const upcoming = deck[index + 1]
  if (!current) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2 text-bauhaus-red">
          <span className="font-display text-3xl font-black tabular-nums">{unknown}</span>
          <span className="font-display text-xs font-bold uppercase tracking-wide">Don't know</span>
        </div>
        <div className="flex items-baseline gap-2 text-bauhaus-blue">
          <span className="font-display text-xs font-bold uppercase tracking-wide">Know</span>
          <span className="font-display text-3xl font-black tabular-nums">{known}</span>
        </div>
      </div>

      <div className="relative h-80 w-full">
        {upcoming && (
          <div className="absolute inset-0 z-0 scale-95 opacity-60">
            <MemoCard front={upcoming.ru} back={upcoming.ka} flipped={false} elevated={false} />
          </div>
        )}
        {/* `key` resets the active card's drag/flip state on each new card. */}
        <ActiveCard key={index} entry={current} onSwipe={handleSwipe} />
      </div>

      <p className="text-center font-display text-sm tabular-nums text-ink/50">
        {index + 1} / {deck.length}
      </p>
    </div>
  )
}

export interface ActiveCardProps {
  entry: VocabEntry
  onSwipe: (direction: number) => void
}

/**
 * The top, interactive card: draggable along X with a card-like tilt and fade
 * tied to the drag position. Flicked past the threshold, it animates off-screen
 * and reports the direction; otherwise it springs back to center. Shared by the
 * free-practice deck and the scheduled card-review deck.
 */
export function ActiveCard({ entry, onSwipe }: ActiveCardProps) {
  const [flipped, setFlipped] = useState(false)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-300, 300], [-18, 18])
  const opacity = useTransform(x, [-300, -150, 0, 150, 300], [0, 1, 1, 1, 0])

  const handleDragEnd = (_event: PointerEvent, info: PanInfo) => {
    const committed =
      Math.abs(info.offset.x) > SWIPE_OFFSET || Math.abs(info.velocity.x) > SWIPE_VELOCITY
    if (!committed) {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
      return
    }
    const direction = info.offset.x > 0 ? 1 : -1
    animate(x, direction * 600, {
      duration: 0.3,
      ease: 'easeOut',
      onComplete: () => onSwipe(direction),
    })
  }

  return (
    <motion.div
      drag="x"
      dragElastic={0.7}
      style={{ x, rotate, opacity }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
    >
      <MemoCard
        front={entry.ru}
        back={entry.ka}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
      />
    </motion.div>
  )
}
