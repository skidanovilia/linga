import type { ReactNode } from 'react'
import { Icon } from '@mdi/react'
import { mdiArrowRight, mdiCheck, mdiClose } from '@mdi/js'
import type { ChallengeStatus } from '../challenges/types'
import { Button, type ButtonVariant } from './Button'

interface CheckBarProps {
  status: ChallengeStatus
  /** Whether the answer is complete enough to check. */
  canCheck: boolean
  /** Correct answer text, revealed on an incorrect attempt. */
  correctAnswer: string
  onCheck: () => void
  onNext: () => void
}

type Feedback = { bg: string; text: string; icon: ReactNode; label: string; next: ButtonVariant }

/**
 * Per-status feedback panel. Correctness is triple-encoded — color, icon, and
 * label — so color is never the sole signal. `corrected` is a *pass* (blue/red
 * stay correct/incorrect) shown in amber: the queue still clears, but the
 * tolerated spelling slip is flagged here and corrected inline in the answer.
 */
const feedback: Record<Exclude<ChallengeStatus, 'idle'>, Feedback> = {
  correct: {
    bg: 'bg-bauhaus-blue',
    text: 'text-white',
    icon: <Icon path={mdiCheck} size="1.5rem" />,
    label: 'Correct',
    next: 'yellow',
  },
  corrected: {
    bg: 'bg-bauhaus-yellow',
    text: 'text-ink',
    icon: <Icon path={mdiCheck} size="1.5rem" />,
    label: 'Almost — spelling fixed',
    next: 'outline',
  },
  incorrect: {
    bg: 'bg-bauhaus-red',
    text: 'text-white',
    icon: <Icon path={mdiClose} size="1.5rem" />,
    label: 'Not quite',
    next: 'yellow',
  },
}

/**
 * The universal bottom bar shared by every challenge type: a "Check" button
 * while idle, then a feedback panel (revealing the correct answer when wrong)
 * with a "Next" button.
 */
export function CheckBar({ status, canCheck, correctAnswer, onCheck, onNext }: CheckBarProps) {
  if (status === 'idle') {
    return (
      <div className="mt-8">
        <Button variant="blue" shape="square" disabled={!canCheck} onClick={onCheck} className="w-full">
          Check
        </Button>
      </div>
    )
  }

  const panel = feedback[status]
  return (
    <div
      className={`mt-8 rounded-none border-2 md:border-4 border-ink p-4 shadow-hard md:shadow-hard-lg ${panel.bg} ${panel.text}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-tight">
            {panel.icon}
            {panel.label}
          </p>
          {status === 'incorrect' && (
            <p className="mt-1 font-content text-sm">
              Correct answer: <span className="font-bold">{correctAnswer}</span>
            </p>
          )}
        </div>
        <Button variant={panel.next} shape="square" onClick={onNext} className="shrink-0">
          Next
          <Icon path={mdiArrowRight} size="1.25rem" />
        </Button>
      </div>
    </div>
  )
}
