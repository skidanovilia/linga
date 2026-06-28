import type { ChallengeComponentProps, ChallengeStatus } from '../types'
import { SentenceGap } from '../../components/SentenceGap'

export function FillTypeChallenge({
  data,
  value,
  onChange,
  status,
  disabled,
}: ChallengeComponentProps<'fill_type'>) {
  return (
    <div className="flex flex-col gap-8">
      <SentenceGap
        sentence={data.sentence}
        renderGap={() => (
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Your answer"
            className={`w-44 border-b-2 bg-transparent text-center font-content text-2xl font-bold outline-none md:border-b-4 ${inputClass(status)}`}
          />
        )}
      />
      <p className="text-center font-display text-sm uppercase tracking-wide text-ink/50">
        Type the missing word using your Georgian keyboard.
      </p>
    </div>
  )
}

function inputClass(status: ChallengeStatus): string {
  if (status === 'correct') return 'border-bauhaus-blue text-bauhaus-blue'
  if (status === 'incorrect') return 'border-bauhaus-red text-bauhaus-red'
  return 'border-ink focus:border-bauhaus-blue'
}
