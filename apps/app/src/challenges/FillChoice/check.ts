import type { FillChoiceData } from '../../types/domain'

/** Each blank's chosen word must match the answer word at the same position. */
export function check(value: string[], data: FillChoiceData): boolean {
  return value.length === data.answer.length && value.every((word, i) => word === data.answer[i])
}
