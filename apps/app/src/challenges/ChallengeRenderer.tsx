import { useState } from 'react'
import type { Challenge, ChallengeType } from '../types/domain'
import { CheckBar } from '../components/CheckBar'
import { registry } from './registry'
import type { AnswerOf, ChallengeDef, ChallengeStatus } from './types'

interface ChallengeRendererProps {
  challenge: Challenge
  /** Reported exactly once, when the user presses Check. */
  onResult: (correct: boolean) => void
  /** Advance to the next challenge (or the result screen). */
  onNext: () => void
}

/**
 * The single dispatch point. It selects the registered definition for the
 * challenge's `type`, owns the lifted answer `value` + `status`, runs the
 * type's `check` on Check, and renders the universal Check → feedback → Next
 * flow via `CheckBar`. This is the only place a (contained) cast lives: TS
 * can't correlate a runtime union key with one homogeneous registry entry.
 */
export function ChallengeRenderer({ challenge, onResult, onNext }: ChallengeRendererProps) {
  const def = registry[challenge.type] as unknown as ChallengeDef<ChallengeType>
  const Component = def.Component

  const [value, setValue] = useState<AnswerOf<ChallengeType>>(def.emptyAnswer)
  const [status, setStatus] = useState<ChallengeStatus>('idle')

  const handleCheck = () => {
    const correct = def.check(value, challenge.data)
    setStatus(correct ? 'correct' : 'incorrect')
    onResult(correct)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        <Component
          data={challenge.data}
          value={value}
          onChange={setValue}
          status={status}
          disabled={status !== 'idle'}
        />
      </div>
      <CheckBar
        status={status}
        canCheck={status === 'idle' && def.isAnswerable(value)}
        correctAnswer={def.describeAnswer(challenge.data)}
        onCheck={handleCheck}
        onNext={onNext}
      />
    </div>
  )
}
