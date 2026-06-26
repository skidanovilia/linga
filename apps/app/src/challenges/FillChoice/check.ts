import type { FillChoiceData } from '../../types/domain'

/** The chosen option must equal the answer exactly. */
export function check(value: string, data: FillChoiceData): boolean {
  return value === data.answer
}
