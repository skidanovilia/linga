import type { TranslateData } from '../../types/domain'

// Sentence separators + the gap underscore. Stripped from both the learner's
// input and the stored orderings so they compare on equal footing.
const STRIP = /[.,!?–—…:;_]/gu

/**
 * The shared sanitizer. Normalizes free text into comparable word tokens:
 * NFC-normalize, strip sentence separators / the gap underscore, collapse
 * whitespace, split on whitespace, drop empties. No lowercasing — Georgian is
 * unicameral. Both the learner's raw input and the per-token expected side run
 * through the same normalization (see `sanitizeToken`).
 */
export function tokenize(input: string): string[] {
  return input
    .normalize('NFC')
    .replace(STRIP, ' ')
    .trim()
    .split(/\s+/u)
    .filter((token) => token.length > 0)
}

/**
 * Per-token normalization for stored answer orderings. They are already token
 * arrays, so we apply the same character-level cleanup as `tokenize` (NFC +
 * strip stray punctuation + trim) without re-splitting.
 */
export function sanitizeToken(token: string): string {
  return token.normalize('NFC').replace(STRIP, '').trim()
}

/** Levenshtein edit distance over Unicode code points (so multi-unit
 *  characters count as one). Used for the single-token ≤ 1 tolerance and to
 *  rank the closest ordering. */
export function levenshtein(a: string, b: string): number {
  const s = [...a]
  const t = [...b]
  const m = s.length
  const n = t.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  let curr = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

export interface TokenMatch {
  /** Same length and every token identical. */
  exact: boolean
  /** Same length, exactly one token differs, and that token is within edit
   *  distance 1 of the expected one. */
  oneError: boolean
  /** oneError only: position of the offending token. */
  errorIndex?: number
  /** oneError only: what the learner typed there. */
  typed?: string
  /** oneError only: the expected (correct) spelling. */
  expected?: string
}

/**
 * Compare two already-sanitized token arrays. Different lengths never match (a
 * missing or extra word is not a spelling error — no fuzzy tolerance), exactly
 * one differing token within edit distance 1 is a tolerated `oneError`, and the
 * tolerance never extends to more than one token.
 */
export function matchTokens(input: string[], expected: string[]): TokenMatch {
  if (input.length !== expected.length) return { exact: false, oneError: false }

  let diffIndex = -1
  for (let i = 0; i < input.length; i++) {
    if (input[i] !== expected[i]) {
      if (diffIndex !== -1) return { exact: false, oneError: false } // more than one diff
      diffIndex = i
    }
  }

  if (diffIndex === -1) return { exact: true, oneError: false }

  if (levenshtein(input[diffIndex], expected[diffIndex]) <= 1) {
    return {
      exact: false,
      oneError: true,
      errorIndex: diffIndex,
      typed: input[diffIndex],
      expected: expected[diffIndex],
    }
  }
  return { exact: false, oneError: false }
}

export interface TranslateResult {
  status: 'correct' | 'corrected' | 'wrong'
  /** The accepted ordering that matched (sanitized), if any. */
  matched?: string[]
  /** corrected only: index of the offending token. */
  errorIndex?: number
  /** corrected only: what the learner typed there. */
  typed?: string
  /** corrected only: the expected (correct) spelling. */
  expected?: string
  /** The closest accepted ordering (raw authored tokens) — the reference
   *  revealed when wrong. */
  closest: string[]
}

/**
 * Check a free-typed translation against the accepted orderings. Scans `answer`
 * in order: the first exact match wins (an exact match anywhere beats any
 * single-error match), otherwise the first single-error match is accepted as a
 * tolerated `corrected` pass, otherwise the answer is `wrong`.
 */
export function checkTranslate(input: string, data: TranslateData): TranslateResult {
  const tokens = tokenize(input)

  let corrected: TranslateResult | null = null
  for (const ordering of data.answer) {
    const expected = ordering.map(sanitizeToken)
    const m = matchTokens(tokens, expected)
    if (m.exact) {
      return { status: 'correct', matched: expected, closest: ordering }
    }
    if (m.oneError && !corrected) {
      corrected = {
        status: 'corrected',
        matched: expected,
        errorIndex: m.errorIndex,
        typed: m.typed,
        expected: m.expected,
        closest: ordering,
      }
    }
  }

  if (corrected) return corrected
  return { status: 'wrong', closest: closestOrdering(tokens, data) }
}

/** The accepted ordering closest (minimum edit distance) to the learner's
 *  tokens, used as the reference answer when wrong. Ties resolve to the first
 *  ordering in authoring order. */
export function closestOrdering(input: string[], data: TranslateData): string[] {
  const typed = input.join(' ')
  let best = data.answer[0]
  let bestDist = Infinity
  for (const ordering of data.answer) {
    const dist = levenshtein(typed, ordering.map(sanitizeToken).join(' '))
    if (dist < bestDist) {
      bestDist = dist
      best = ordering
    }
  }
  return best
}
