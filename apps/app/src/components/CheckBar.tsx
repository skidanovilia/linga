import { ArrowRight, Check, X } from 'lucide-react'
import type { ChallengeStatus } from '../challenges/types'
import { Button } from './Button'

interface CheckBarProps {
  status: ChallengeStatus
  /** Whether the answer is complete enough to check. */
  canCheck: boolean
  /** Correct answer text, revealed on an incorrect attempt. */
  correctAnswer: string
  onCheck: () => void
  onNext: () => void
}

/**
 * The universal bottom bar shared by every challenge type: a "Check" button
 * while idle, then a blue/red feedback panel (revealing the correct answer when
 * wrong) with a "Next" button. Correctness is triple-encoded — color (blue vs
 * red, colorblind-safe), icon (check vs cross), and label — so color is never
 * the sole signal.
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

  const correct = status === 'correct'
  return (
    <div
      className={`mt-8 rounded-none border-2 md:border-4 border-ink p-4 text-white shadow-hard md:shadow-hard-lg ${
        correct ? 'bg-bauhaus-blue' : 'bg-bauhaus-red'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-tight">
            {correct ? <Check className="h-6 w-6" strokeWidth={3} /> : <X className="h-6 w-6" strokeWidth={3} />}
            {correct ? 'Correct' : 'Not quite'}
          </p>
          {!correct && (
            <p className="mt-1 font-content text-sm">
              Correct answer: <span className="font-bold">{correctAnswer}</span>
            </p>
          )}
        </div>
        <Button variant="yellow" shape="square" onClick={onNext} className="shrink-0">
          Next
          <ArrowRight className="h-5 w-5" strokeWidth={3} />
        </Button>
      </div>
    </div>
  )
}
