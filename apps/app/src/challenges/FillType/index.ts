import type { ChallengeDef } from '../types'
import { FillTypeChallenge } from './FillTypeChallenge'
import { check } from './check'

export const fillTypeDef: ChallengeDef<'fill_type'> = {
  type: 'fill_type',
  Component: FillTypeChallenge,
  emptyAnswer: '',
  isAnswerable: (value) => value.trim().length > 0,
  check,
  describeAnswer: (data) => data.answer,
}
