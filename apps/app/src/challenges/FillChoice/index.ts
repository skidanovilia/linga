import type { ChallengeDef } from '../types'
import { FillChoiceChallenge } from './FillChoiceChallenge'
import { check } from './check'

export const fillChoiceDef: ChallengeDef<'fill_choice'> = {
  type: 'fill_choice',
  Component: FillChoiceChallenge,
  emptyAnswer: [],
  isAnswerable: (value, data) => value.length === data.answer.length,
  check,
  describeAnswer: (data) => data.answer.join(' '),
}
