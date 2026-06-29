import type { ChallengeType } from '../types/domain'
import type { ChallengeDef } from './types'
import { fillChoiceDef } from './FillChoice'
import { orderDef } from './Order'
import { fillTypeDef } from './FillType'
import { translateDef } from './Translate'

/**
 * The challenge-type registry. The mapped type makes it *exhaustive*: forget to
 * register a `ChallengeType` and it's a compile error. Adding a new type is a
 * one-line edit here (plus its union member and component).
 */
export type ChallengeRegistry = {
  [T in ChallengeType]: ChallengeDef<T>
}

export const registry: ChallengeRegistry = {
  fill_choice: fillChoiceDef,
  order: orderDef,
  fill_type: fillTypeDef,
  translate: translateDef,
}
