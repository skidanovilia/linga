import { motion } from 'motion/react'

interface MemoCardProps {
  /** Russian text — shown on the front. */
  front: string
  /** Georgian text — shown on the back. */
  back: string
  /** When true, the card is rotated to reveal the back. */
  flipped: boolean
  /** Called on a tap; toggles the flip. Omit for non-interactive (background) cards. */
  onFlip?: () => void
}

const faceClass =
  'absolute inset-0 flex items-center justify-center rounded-2xl border border-slate-200 p-6 text-center shadow-sm'

/**
 * A single flip card. The front shows Russian, the back shows Georgian. The
 * flip is a 3D `rotateY` on a `preserve-3d` layer with both faces hidden on
 * their back side; the parent supplies `perspective`. Tapping calls `onFlip`.
 * The tap gesture auto-cancels once a drag begins on an ancestor (>3px move),
 * so flipping and swiping don't conflict.
 */
export function MemoCard({ front, back, flipped, onFlip }: MemoCardProps) {
  return (
    <div className="h-full w-full" style={{ perspective: 1000 }}>
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
          <span className="text-3xl font-semibold text-slate-900">{front}</span>
        </div>
        <div
          className={`${faceClass} bg-slate-900`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <span className="text-3xl font-semibold text-white">{back}</span>
        </div>
      </motion.div>
    </div>
  )
}
