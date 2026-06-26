import type { OrderData } from '../../types/domain'

/** The assembled words must match the answer in length and order. */
export function check(value: string[], data: OrderData): boolean {
  return (
    value.length === data.answer.length &&
    value.every((word, i) => word === data.answer[i])
  )
}
