import type { ComponentType } from 'react'
import type { Challenge, ChallengeType } from '../types/domain'

/** Runtime shape of the user's working answer, per challenge type. */
export interface AnswerByType {
  fill_choice: string[]
  order: string[]
  fill_type: string
  /** translate — the learner's free-typed Georgian sentence. */
  translate: string
}

export type AnswerOf<T extends ChallengeType> = AnswerByType[T]
export type DataOf<T extends ChallengeType> = Extract<Challenge, { type: T }>['data']

/**
 * `corrected` is a *pass* (the queue clears the item) that still flags a single
 * tolerated spelling slip — `translate` uses it; the other types only ever
 * resolve to `correct` / `incorrect`.
 */
export type ChallengeStatus = 'idle' | 'correct' | 'corrected' | 'incorrect'

/** The three terminal outcomes a check can produce (no `idle`). */
export type ChallengeOutcomeStatus = 'correct' | 'corrected' | 'incorrect'

/**
 * Every challenge component is a *controlled input*: it renders the prompt and
 * the user's working answer, reports changes via `onChange`, and reflects
 * `status`/`disabled` styling. It never decides correctness, advances, or
 * renders the Check/Next bar — that is the renderer's job.
 */
export interface ChallengeComponentProps<T extends ChallengeType> {
  data: DataOf<T>
  value: AnswerOf<T>
  onChange: (value: AnswerOf<T>) => void
  status: ChallengeStatus
  disabled: boolean
}

/** A single registry entry fully describes one challenge type. */
export interface ChallengeDef<T extends ChallengeType> {
  type: T
  Component: ComponentType<ChallengeComponentProps<T>>
  /** Initial working answer. */
  emptyAnswer: AnswerOf<T>
  /** Whether the current answer is complete enough to enable "Check". */
  isAnswerable: (value: AnswerOf<T>, data: DataOf<T>) => boolean
  /** Pure correctness check (binary). */
  check: (value: AnswerOf<T>, data: DataOf<T>) => boolean
  /**
   * Optional richer evaluation. When present, the renderer uses it instead of
   * `check` so a type can resolve a third `corrected` outcome (a tolerated
   * spelling slip that still passes). `corrected` and `correct` both clear the
   * queue; only `incorrect` re-queues.
   */
  evaluate?: (value: AnswerOf<T>, data: DataOf<T>) => { status: ChallengeOutcomeStatus }
  /** Human-readable correct answer, revealed when the user is wrong. Receives
   *  the current `value` so a type can reveal the closest accepted answer. */
  describeAnswer: (data: DataOf<T>, value: AnswerOf<T>) => string
}
