import type { OrderData } from '../../types/domain'

/** The assembled words must match any one of the accepted orderings. */
export function check(value: string[], data: OrderData): boolean {
  return data.answer.some(
    (option) =>
      value.length === option.length &&
      value.every((word, i) => word === option[i]),
  )
}
