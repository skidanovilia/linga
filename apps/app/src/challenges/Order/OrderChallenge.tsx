import { useMemo, useState } from 'react'
import type { ChallengeComponentProps, ChallengeStatus } from '../types'
import { shuffle } from '../../lib/shuffle'

export function OrderChallenge({
  data,
  onChange,
  status,
  disabled,
}: ChallengeComponentProps<'order'>) {
  // Shuffled word bank, stable across re-renders. We track the user's selection
  // by token *index* (not by word) so repeated words stay unambiguous.
  const tokens = useMemo(() => shuffle(data.answer), [data])
  const [selected, setSelected] = useState<number[]>([])

  const update = (next: number[]) => {
    setSelected(next)
    onChange(next.map((i) => tokens[i]))
  }

  const toggle = (i: number) => {
    if (disabled) return
    update(selected.includes(i) ? selected.filter((s) => s !== i) : [...selected, i])
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="whitespace-pre-line text-center text-lg text-slate-500">{data.ru}</p>

      {/* Assembled answer line — tap a word to remove it. */}
      <div
        className={`flex min-h-[3.5rem] flex-wrap items-center gap-2 rounded-xl border p-3 ${answerLineClass(status)}`}
      >
        {selected.length === 0 ? (
          <span className="text-slate-400">Tap words to build the sentence…</span>
        ) : (
          selected.map((i) => (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => toggle(i)}
              className="rounded-lg bg-white px-3 py-1.5 text-lg font-medium shadow-sm"
            >
              {tokens[i]}
            </button>
          ))
        )}
      </div>

      {/* Word bank — tap a word to add it to the answer line. */}
      <div className="flex flex-wrap justify-center gap-2">
        {tokens.map((word, i) => {
          const used = selected.includes(i)
          return (
            <button
              key={i}
              type="button"
              disabled={disabled || used}
              onClick={() => toggle(i)}
              className={`rounded-lg border px-3 py-1.5 text-lg font-medium transition ${
                used
                  ? 'border-slate-100 bg-slate-100 text-slate-300'
                  : 'border-slate-200 bg-white enabled:hover:border-slate-300'
              }`}
            >
              {word}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function answerLineClass(status: ChallengeStatus): string {
  if (status === 'correct') return 'border-green-300 bg-green-50'
  if (status === 'incorrect') return 'border-red-300 bg-red-50'
  return 'border-slate-200 bg-slate-50'
}
