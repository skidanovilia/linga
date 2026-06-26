import type { ChallengeDef } from '../types'
import { OrderChallenge } from './OrderChallenge'
import { check } from './check'

export const orderDef: ChallengeDef<'order'> = {
  type: 'order',
  Component: OrderChallenge,
  emptyAnswer: [],
  isAnswerable: (value) => value.length > 0,
  check,
  describeAnswer: (data) => data.answer.join(' '),
}
