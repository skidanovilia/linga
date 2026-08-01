import { useState } from 'react'
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { MemoCard } from './MemoCard'

/** Past this horizontal offset (px) or pointer velocity, a release commits a swipe. */
const SWIPE_OFFSET = 120
const SWIPE_VELOCITY = 500

export interface ActiveCardProps {
  front: string
  back: string
  onSwipe: (direction: number) => void
}

/**
 * The top, interactive card: draggable along X with a card-like tilt and fade
 * tied to the drag position. Flicked past the threshold, it animates off-screen
 * and reports the direction; otherwise it springs back to center. Used by the
 * scheduled card-review deck.
 */
export function ActiveCard({ front, back, onSwipe }: ActiveCardProps) {
  const [flipped, setFlipped] = useState(false)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-300, 300], [-18, 18])
  const opacity = useTransform(x, [-300, -150, 0, 150, 300], [0, 1, 1, 1, 0])
  // Live swipe feedback: fades in with the drag and peaks at the commit
  // threshold, so reaching full color means "releasing now will count". A small
  // dead zone past 0 keeps a resting card from flashing on a stray pixel.
  const knowOpacity = useTransform(x, [10, SWIPE_OFFSET], [0, 1])
  const nopeOpacity = useTransform(x, [-SWIPE_OFFSET, -10], [1, 0])

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
        front={front}
        back={back}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
      />

      {/* Drag right = green "Know"; drag left = red "Don't know". Overlays sit
          above the card (and its 3D flip) and are pointer-transparent, so they
          never block the drag or the tap-to-flip underneath. */}
      <motion.div
        aria-hidden
        style={{ opacity: knowOpacity }}
        className="pointer-events-none absolute inset-0 flex items-start justify-center rounded-none border-4 border-bauhaus-green bg-bauhaus-green/20"
      >
        <span className="mt-5 -rotate-6 border-2 border-ink bg-bauhaus-green px-4 py-1 font-display text-xl font-black uppercase tracking-tight text-white shadow-hard-sm">
          Know
        </span>
      </motion.div>
      <motion.div
        aria-hidden
        style={{ opacity: nopeOpacity }}
        className="pointer-events-none absolute inset-0 flex items-start justify-center rounded-none border-4 border-bauhaus-red bg-bauhaus-red/20"
      >
        <span className="mt-5 rotate-6 border-2 border-ink bg-bauhaus-red px-4 py-1 font-display text-xl font-black uppercase tracking-tight text-white shadow-hard-sm">
          Don't know
        </span>
      </motion.div>
    </motion.div>
  )
}
