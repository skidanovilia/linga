import { describe, expect, it } from 'vitest'
import type { Challenge, ChallengeType } from '../types/domain'
import { interleaveByType } from './adapters'

// Minimal challenge stub — only `id` and `type` matter to the interleave.
const ch = (id: string, type: ChallengeType): Challenge =>
  ({ id, type, data: {} }) as Challenge

const types = (cs: Challenge[]) => cs.map((c) => c.type)
const ids = (cs: Challenge[]) => cs.map((c) => c.id)

describe('interleaveByType', () => {
  it('alternates types that arrive in solid DB-order blocks', () => {
    const input = [
      ch('a1', 'fill_choice'),
      ch('a2', 'fill_choice'),
      ch('a3', 'fill_choice'),
      ch('b1', 'order'),
      ch('b2', 'order'),
      ch('c1', 'fill_type'),
    ]
    expect(types(interleaveByType(input))).toEqual([
      'fill_choice',
      'order',
      'fill_type',
      'fill_choice',
      'order',
      'fill_choice',
    ])
  })

  it('collapses to the remaining types once a type runs out', () => {
    const input = [
      ch('a1', 'fill_choice'),
      ch('a2', 'fill_choice'),
      ch('a3', 'fill_choice'),
      ch('b1', 'order'),
    ]
    expect(ids(interleaveByType(input))).toEqual(['a1', 'b1', 'a2', 'a3'])
  })

  it('uses first-seen order of types as the rotation order', () => {
    const input = [ch('b1', 'order'), ch('a1', 'fill_choice'), ch('a2', 'fill_choice')]
    expect(types(interleaveByType(input))).toEqual(['order', 'fill_choice', 'fill_choice'])
  })

  it('preserves each type’s internal order and loses no items', () => {
    const input = [
      ch('a1', 'fill_choice'),
      ch('b1', 'order'),
      ch('a2', 'fill_choice'),
      ch('b2', 'order'),
    ]
    const out = interleaveByType(input)
    expect(out).toHaveLength(input.length)
    expect(ids(out.filter((c) => c.type === 'fill_choice'))).toEqual(['a1', 'a2'])
    expect(ids(out.filter((c) => c.type === 'order'))).toEqual(['b1', 'b2'])
  })

  it('is deterministic across repeated calls', () => {
    const input = [ch('a1', 'fill_choice'), ch('b1', 'order'), ch('a2', 'fill_choice')]
    expect(ids(interleaveByType(input))).toEqual(ids(interleaveByType(input)))
  })

  it('handles empty and single-type inputs', () => {
    expect(interleaveByType([])).toEqual([])
    const single = [ch('a1', 'fill_choice'), ch('a2', 'fill_choice')]
    expect(ids(interleaveByType(single))).toEqual(['a1', 'a2'])
  })
})
