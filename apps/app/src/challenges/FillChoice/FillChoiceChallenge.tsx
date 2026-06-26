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
              className={`rounded-md px-2 py-0.5 font-semibold ${gapClass(status)}`}
            >
              {options[selected[b]]}
            </button>
          ) : (
            <span className="inline-block w-16 border-b-2 border-slate-300" />
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
              className={`rounded-xl border px-4 py-3 text-lg font-medium transition disabled:cursor-not-allowed ${
                used
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white enabled:hover:border-slate-300 disabled:opacity-40'
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
