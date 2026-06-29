import type { ChallengeDef, ChallengeOutcomeStatus } from '../types'
import { TranslateChallenge } from './TranslateChallenge'
import { checkTranslate, closestOrdering, tokenize } from './check'

/** Map the checker's vocabulary (`wrong`) onto the engine's (`incorrect`). */
const OUTCOME: Record<'correct' | 'corrected' | 'wrong', ChallengeOutcomeStatus> = {
  correct: 'correct',
  corrected: 'corrected',
  wrong: 'incorrect',
}

export const translateDef: ChallengeDef<'translate'> = {
  type: 'translate',
  Component: TranslateChallenge,
  emptyAnswer: '',
  isAnswerable: (value) => value.trim().length > 0,
  check: (value, data) => checkTranslate(value, data).status !== 'wrong',
  evaluate: (value, data) => ({ status: OUTCOME[checkTranslate(value, data).status] }),
  describeAnswer: (data, value) => closestOrdering(tokenize(value), data).join(' '),
}
