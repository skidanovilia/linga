import { motion } from 'motion/react'

interface MemoCardProps {
  /** The prompt side, shown before the flip. Language is the caller's choice. */
  front: string
  /** The answer side, revealed by the flip. Language is the caller's choice. */
  back: string
  /** When true, the card is rotated to reveal the back. */
  flipped: boolean
  /** Called on a tap; toggles the flip. Omit for non-interactive (background) cards. */
  onFlip?: () => void
  /** Hard offset shadow on the (non-rotating) outer frame. Peek/background cards
   *  pass false so the stack doesn't show a doubled shadow. */
  elevated?: boolean
}

// Square Bauhaus faces: thick ink border, no shadow here — the offset shadow
// lives on the outer frame so it never enters the 3D rotation (a shadow on a
// backface-visibility-hidden face culls/flips when rotated 180°).
const faceClass =
  'absolute inset-0 flex items-center justify-center rounded-none border-2 md:border-4 border-ink p-6 text-center'

/**
 * A single flip card over two already-resolved strings: the card is blind to
 * which language is on which side — callers decide that (scheduled review
 * prompts in Russian, free practice in Georgian). The flip is a 3D `rotateY`
 * on a `preserve-3d` layer with both faces hidden on their back side; the
 * parent supplies `perspective`. Tapping calls `onFlip`. The tap gesture
 * auto-cancels once a drag begins on an ancestor (>3px move), so flipping and
 * swiping don't conflict.
 */
export function MemoCard({ front, back, flipped, onFlip, elevated = true }: MemoCardProps) {
  return (
    <div
      className={`h-full w-full ${elevated ? 'shadow-hard-lg md:shadow-hard-xl' : ''}`}
      style={{ perspective: 1000 }}
    >
      <motion.div
        onTap={onFlip}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ transformStyle: 'preserve-3d' }}
        className={`relative h-full w-full select-none ${onFlip ? 'cursor-pointer' : ''}`}
      >
        <div
          className={`${faceClass} bg-white`}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <span className="font-content text-3xl font-bold text-ink md:text-4xl">{front}</span>
        </div>
        <div
          className={`${faceClass} bg-ink`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <span className="font-content text-3xl font-bold text-white md:text-4xl">{back}</span>
        </div>
      </motion.div>
    </div>
  )
}
