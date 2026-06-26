import { Fragment, type ReactNode } from 'react'

interface SentenceGapProps {
  sentence: string
  /** Rendered in place of each `___` gap, by gap index (left to right). */
  renderGap: (index: number) => ReactNode
}

const GAP = '___'

/** Renders a sentence, replacing every `___` marker with `renderGap(index)`. */
export function SentenceGap({ sentence, renderGap }: SentenceGapProps) {
  // N gaps split the sentence into N+1 text segments; interleave a slot between them.
  const segments = sentence.split(GAP)
  return (
    <p className="whitespace-pre-line text-center text-2xl leading-relaxed">
      {segments.map((segment, i) => (
        <Fragment key={i}>
          <span>{segment}</span>
          {i < segments.length - 1 && (
            <span className="mx-1 inline-flex min-w-[3rem] items-center justify-center align-middle">
              {renderGap(i)}
            </span>
          )}
        </Fragment>
      ))}
    </p>
  )
}
