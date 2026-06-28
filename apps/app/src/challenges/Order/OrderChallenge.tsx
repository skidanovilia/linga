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
  const tokens = useMemo(() => shuffle(data.answer[0]), [data])
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
      <p className="whitespace-pre-line text-center font-content text-lg text-ink/70">{data.ru}</p>

      {/* Assembled answer line — tap a word to remove it. */}
      <div
        className={`flex min-h-[3.5rem] flex-wrap items-center gap-2 rounded-none border-2 p-3 ${answerLineClass(status)}`}
      >
        {selected.length === 0 ? (
          <span className="font-content text-ink/40">Tap words to build the sentence…</span>
        ) : (
          selected.map((i) => (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => toggle(i)}
              className="rounded-none border-2 border-ink bg-white px-3 py-1.5 font-content text-lg font-medium shadow-hard-sm"
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
              className={`rounded-none border-2 px-3 py-1.5 font-content text-lg font-medium transition-transform duration-200 ease-out ${
                used
                  ? 'border-ink/30 bg-muted text-ink/30'
                  : 'border-ink bg-white shadow-hard-sm enabled:hover:-translate-y-0.5'
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
  if (status === 'correct') return 'border-bauhaus-blue bg-white'
  if (status === 'incorrect') return 'border-bauhaus-red bg-white'
  return 'border-ink bg-canvas'
}
