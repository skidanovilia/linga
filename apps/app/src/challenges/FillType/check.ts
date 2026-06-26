import type { FillTypeData } from '../../types/domain'
import { normalize } from '../../lib/normalize'

/** Compare typed text to the answer after normalization (see `normalize`). */
export function check(value: string, data: FillTypeData): boolean {
  return normalize(value) === normalize(data.answer)
}
