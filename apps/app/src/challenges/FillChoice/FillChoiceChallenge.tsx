import { useMemo, useState } from 'react'
import type { ChallengeComponentProps, ChallengeStatus } from '../types'
import { SentenceGap } from '../../components/SentenceGap'
import { shuffle } from '../../lib/shuffle'

export function FillChoiceChallenge({
  data,
  onChange,
  status,
  disabled,
}: ChallengeComponentProps<'fill_choice'>) {
  // Shuffle once per challenge, not on every render. We track the user's choices
  // by option *index* (not word) so repeated/duplicate options stay unambiguous.
  const options = useMemo(() => shuffle(data.options), [data])
  const blankCount = data.answer.length

  // Selected option indices, in blank order: selected[b] fills the b-th `___`.
  const [selected, setSelected] = useState<number[]>([])

  const update = (next: number[]) => {
    setSelected(next)
    onChange(next.map((i) => options[i]))
  }

  const toggle = (i: number) => {
    if (disabled) return
    if (selected.includes(i)) {
      update(selected.filter((s) => s !== i))
    } else if (selected.length < blankCount) {
      update([...selected, i])
    }
  }

  const full = selected.length >= blankCount

  return (
    <div className="flex flex-col gap-10">
      <SentenceGap
        sentence={data.sentence}
        renderGap={(b) =>
          b < selected.length ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => toggle(selected[b])}
              className={`rounded-none border-2 px-2 py-0.5 font-content font-bold ${gapClass(status)}`}
            >
              {options[selected[b]]}
            </button>
          ) : (
            <span className="inline-block w-16 border-b-2 border-ink" />
          )
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {options.map((option, i) => {
          const used = selected.includes(i)
          return (
            <button
              key={i}
              type="button"
              disabled={disabled || (!used && full)}
              onClick={() => toggle(i)}
              className={`rounded-none border-2 border-ink px-4 py-3 font-content text-lg font-medium transition-transform duration-200 ease-out disabled:cursor-not-allowed ${
                used
                  ? 'bg-ink text-white shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                  : 'bg-white shadow-hard enabled:active:translate-x-[2px] enabled:active:translate-y-[2px] enabled:active:shadow-none disabled:border-ink/30 disabled:text-ink/30 disabled:shadow-none'
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
  if (status === 'correct') return 'border-bauhaus-blue text-bauhaus-blue'
  if (status === 'incorrect') return 'border-bauhaus-red text-bauhaus-red'
  return 'border-ink text-ink'
}
