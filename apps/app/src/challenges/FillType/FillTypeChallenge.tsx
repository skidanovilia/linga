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
            className={`w-44 border-b-2 bg-transparent text-center text-2xl font-semibold outline-none ${inputClass(status)}`}
          />
        )}
      />
      <p className="text-center text-sm text-slate-400">
        Type the missing word using your Georgian keyboard.
      </p>
    </div>
  )
}

function inputClass(status: ChallengeStatus): string {
  if (status === 'correct') return 'border-green-400 text-green-700'
  if (status === 'incorrect') return 'border-red-400 text-red-700'
  return 'border-slate-300 focus:border-slate-900'
}
