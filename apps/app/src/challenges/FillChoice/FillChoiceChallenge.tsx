import { useMemo } from 'react'
import type { ChallengeComponentProps, ChallengeStatus } from '../types'
import { SentenceGap } from '../../components/SentenceGap'
import { shuffle } from '../../lib/shuffle'

export function FillChoiceChallenge({
  data,
  value,
  onChange,
  status,
  disabled,
}: ChallengeComponentProps<'fill_choice'>) {
  // Shuffle once per challenge, not on every keystroke/render.
  const options = useMemo(() => shuffle(data.options), [data])

  return (
    <div className="flex flex-col gap-10">
      <SentenceGap sentence={data.sentence}>
        {value ? (
          <span className={`rounded-md px-2 py-0.5 font-semibold ${gapClass(status)}`}>
            {value}
          </span>
        ) : (
          <span className="inline-block w-16 border-b-2 border-slate-300" />
        )}
      </SentenceGap>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const selected = value === option
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onChange(selected ? '' : option)}
              className={`rounded-xl border px-4 py-3 text-lg font-medium transition disabled:cursor-not-allowed ${
                selected
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white enabled:hover:border-slate-300'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function gapClass(status: ChallengeStatus): string {
  if (status === 'correct') return 'bg-green-100 text-green-800'
  if (status === 'incorrect') return 'bg-red-100 text-red-800'
  return 'bg-slate-100 text-slate-900'
}
