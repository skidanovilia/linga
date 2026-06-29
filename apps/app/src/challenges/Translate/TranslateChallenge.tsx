import { useMemo } from 'react'
import type { ChallengeComponentProps, ChallengeStatus } from '../types'
import { checkTranslate, tokenize } from './check'

/**
 * Free-typed translation: the learner reads the Russian prompt and types the
 * full Georgian sentence from scratch (no word bank). After checking, a single
 * tolerated spelling slip (`corrected`) is surfaced inline — the mistyped token
 * struck through in red with the correct form shown beside it.
 */
export function TranslateChallenge({
  data,
  value,
  onChange,
  status,
  disabled,
}: ChallengeComponentProps<'translate'>) {
  // Re-derive the structured result for inline rendering. Pure and cheap; only
  // read once `status !== 'idle'`.
  const result = useMemo(() => checkTranslate(value, data), [value, data])
  const typedTokens = useMemo(() => tokenize(value), [value])

  return (
    <div className="flex flex-col gap-8">
      <p className="whitespace-pre-line text-center font-content text-lg text-ink/70">{data.ru}</p>

      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Your translation"
        className={`w-full border-b-2 bg-transparent pb-2 text-center font-content text-2xl font-bold outline-none md:border-b-4 ${inputClass(status)}`}
      />

      {/* Inline spelling correction: the one tolerated slip, fixed in place. */}
      {status === 'corrected' && result.status === 'corrected' && (
        <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 font-content text-xl">
          {typedTokens.map((token, i) =>
            i === result.errorIndex ? (
              <span key={i} className="font-bold">
                <span className="text-bauhaus-red line-through">{token}</span>{' '}
                <span className="text-bauhaus-blue">{result.expected}</span>
              </span>
            ) : (
              <span key={i} className="text-ink">
                {token}
              </span>
            ),
          )}
        </div>
      )}

      {status === 'idle' && (
        <p className="text-center font-display text-sm uppercase tracking-wide text-ink/50">
          Type the full translation using your Georgian keyboard.
        </p>
      )}
    </div>
  )
}

function inputClass(status: ChallengeStatus): string {
  if (status === 'correct') return 'border-bauhaus-blue text-bauhaus-blue'
  if (status === 'corrected') return 'border-bauhaus-yellow text-ink'
  if (status === 'incorrect') return 'border-bauhaus-red text-bauhaus-red'
  return 'border-ink focus:border-bauhaus-blue'
}
