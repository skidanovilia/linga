import { describe, expect, it } from 'vitest'
import { createClearQueueSession, type ClearQueueItem } from './clearQueue'

// Identity shuffle keeps the queue in input order so placement is deterministic.
const identity = <U,>(items: readonly U[]): U[] => [...items]

function items(ids: string[]): ClearQueueItem<string>[] {
  return ids.map((id) => ({ id, content: id }))
}

// Walk to the end answering every item correctly.
function clearAll(session: ReturnType<typeof createClearQueueSession<string>>) {
  while (!session.isComplete()) {
    session.answer(true)
    session.next()
  }
}

describe('createClearQueueSession', () => {
  it('starts as the shuffled queue of all items', () => {
    const session = createClearQueueSession(items(['a', 'b', 'c']), {
      requeueGap: 2,
      shuffle: identity,
    })
    expect(session.current()?.id).toBe('a')
    expect(session.remaining()).toBe(3)
    expect(session.isComplete()).toBe(false)
  })

  it('clears a correct answer — it is not shown again this run', () => {
    const session = createClearQueueSession(items(['a', 'b']), {
      requeueGap: 2,
      shuffle: identity,
    })
    session.answer(true)
    session.next()
    expect(session.current()?.id).toBe('b')
    session.answer(true)
    session.next()
    expect(session.isComplete()).toBe(true)
    expect(session.summary()).toEqual({ answered: 2, correct: 2, total: 2 })
  })

  it('re-inserts a wrong item later in the run — not immediately next', () => {
    const session = createClearQueueSession(items(['a', 'b', 'c', 'd']), {
      requeueGap: 2,
      shuffle: identity,
    })
    session.answer(false) // wrong on 'a' at position 0
    session.next()
    expect(session.current()?.id).toBe('b')
    session.next()
    expect(session.current()?.id).toBe('c')
    session.next()
    expect(session.current()?.id).toBe('a') // requeued a gap of 2 later
    session.next()
    expect(session.current()?.id).toBe('d')
  })

  it('keeps re-queuing a repeatedly-wrong item until it is answered correctly', () => {
    const session = createClearQueueSession(items(['a', 'b']), {
      requeueGap: 1,
      shuffle: identity,
    })
    // Wrong on 'a' repeatedly: it must keep coming back (no once-only guard).
    session.answer(false) // a wrong → requeued
    session.next() // b
    expect(session.current()?.id).toBe('b')
    session.answer(true) // clear b
    session.next() // a (requeued)
    expect(session.current()?.id).toBe('a')
    session.answer(false) // a wrong again → requeued once more
    session.next()
    expect(session.current()?.id).toBe('a')
    expect(session.isComplete()).toBe(false)
    session.answer(true) // finally clear a
    session.next()
    expect(session.isComplete()).toBe(true)
    expect(session.remaining()).toBe(0)
  })

  it('completes only when the queue empties; remaining tracks distinct items left', () => {
    const session = createClearQueueSession(items(['a', 'b', 'c']), {
      requeueGap: 2,
      shuffle: identity,
    })
    expect(session.remaining()).toBe(3)
    session.answer(true)
    session.next()
    expect(session.remaining()).toBe(2)
    clearAll(session)
    expect(session.isComplete()).toBe(true)
    expect(session.remaining()).toBe(0)
  })

  it('an empty module is immediately complete', () => {
    const session = createClearQueueSession(items([]), { requeueGap: 2, shuffle: identity })
    expect(session.isComplete()).toBe(true)
    expect(session.current()).toBeNull()
    expect(session.summary()).toEqual({ answered: 0, correct: 0, total: 0 })
  })
})
