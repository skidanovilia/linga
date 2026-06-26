import type { ReactNode } from 'react'

interface SentenceGapProps {
  sentence: string
  /** Rendered in place of the `___` gap. */
  children: ReactNode
}

const GAP = '___'

/** Renders a sentence, replacing the `___` marker with `children` (the slot). */
export function SentenceGap({ sentence, children }: SentenceGapProps) {
  const [before, after] = splitOnGap(sentence)
  return (
    <p className="text-center text-2xl leading-relaxed">
      <span>{before}</span>
      <span className="mx-1 inline-flex min-w-[3rem] items-center justify-center align-middle">
        {children}
      </span>
      <span>{after}</span>
    </p>
  )
}

function splitOnGap(sentence: string): [string, string] {
  const i = sentence.indexOf(GAP)
  if (i === -1) return [sentence, '']
  return [sentence.slice(0, i), sentence.slice(i + GAP.length)]
}
