import type { ChallengeStatus } from '../challenges/types'

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
 * while idle, then a green/red feedback panel (revealing the correct answer
 * when wrong) with a "Next" button.
 */
export function CheckBar({ status, canCheck, correctAnswer, onCheck, onNext }: CheckBarProps) {
  if (status === 'idle') {
    return (
      <div className="mt-8">
        <button
          type="button"
          disabled={!canCheck}
          onClick={onCheck}
          className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition enabled:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Check
        </button>
      </div>
    )
  }

  const correct = status === 'correct'
  return (
    <div
      className={`mt-8 rounded-xl border p-4 ${
        correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className={`font-semibold ${correct ? 'text-green-700' : 'text-red-700'}`}>
            {correct ? 'Correct!' : 'Not quite'}
          </p>
          {!correct && (
            <p className="mt-1 text-sm text-red-700">
              Correct answer: <span className="font-medium">{correctAnswer}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onNext}
          className={`shrink-0 rounded-xl px-6 py-3 font-semibold text-white transition ${
            correct ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  )
}
