import type { ChallengeDef } from '../types'
import { FillChoiceChallenge } from './FillChoiceChallenge'
import { check } from './check'

export const fillChoiceDef: ChallengeDef<'fill_choice'> = {
  type: 'fill_choice',
  Component: FillChoiceChallenge,
  emptyAnswer: '',
  isAnswerable: (value) => value.length > 0,
  check,
  describeAnswer: (data) => data.answer,
}
