// The one persistence boundary for memo cards. The engine and adapter depend on
// the `ProgressStore` interface and never touch Supabase directly, so the
// backend stays swappable. The Supabase implementation below is pointed at the
// card progress table (vocab_progress). Challenges no longer persist per-item
// state — they record only module completion (see lib/queue/completionStore).

import { supabase } from '../../data/supabase'
import type { ProgressState, ReviewItem, Result } from './types'

/** Loads a user's progress and persists single-row updates. */
export interface ProgressStore {
  /** Existing rows for these item ids, keyed by id. Missing id = new item. */
  loadProgress(itemIds: string[]): Promise<Map<string, ProgressState>>
  /** Insert-on-first-touch / update-thereafter for one item. */
  upsertProgress(itemId: string, state: ProgressState): Promise<void>
}

/**
 * Left-join content against loaded progress: a row present → its state; a row
 * absent → `null` (new). This is where "new = absent row" is realised, on read.
 */
export function toReviewItems<T>(
  items: { id: string; content: T }[],
  progress: Map<string, ProgressState>,
): ReviewItem<T>[] {
  return items.map(({ id, content }) => ({
    id,
    content,
    state: progress.get(id) ?? null,
  }))
}

export type ProgressTable = 'vocab_progress'
export type ProgressIdColumn = 'vocab_id'

interface ProgressRow {
  box: number
  due_at: string
  reps: number
  lapses: number
  last_result: Result | null
  last_seen_at: string | null
}

function rowToState(row: ProgressRow): ProgressState {
  return {
    box: row.box,
    dueAt: new Date(row.due_at),
    reps: row.reps,
    lapses: row.lapses,
    lastResult: row.last_result,
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : null,
  }
}

/**
 * Supabase-backed store for one shelf. RLS already scopes every row to the
 * signed-in user; we pass `userId` so the upsert can write the key columns.
 */
export class SupabaseProgressStore implements ProgressStore {
  constructor(
    private readonly table: ProgressTable,
    private readonly idColumn: ProgressIdColumn,
    private readonly userId: string,
  ) {}

  async loadProgress(itemIds: string[]): Promise<Map<string, ProgressState>> {
    const map = new Map<string, ProgressState>()
    if (itemIds.length === 0) return map

    const { data, error } = await supabase
      .from(this.table)
      .select(`${this.idColumn}, box, due_at, reps, lapses, last_result, last_seen_at`)
      .in(this.idColumn, itemIds)
    if (error) throw error

    for (const row of data as (ProgressRow & Record<ProgressIdColumn, string>)[]) {
      map.set(row[this.idColumn], rowToState(row))
    }
    return map
  }

  async upsertProgress(itemId: string, state: ProgressState): Promise<void> {
    const updatedAt = (state.lastSeenAt ?? state.dueAt).toISOString()
    const row = {
      user_id: this.userId,
      [this.idColumn]: itemId,
      box: state.box,
      due_at: state.dueAt.toISOString(),
      reps: state.reps,
      lapses: state.lapses,
      last_result: state.lastResult,
      last_seen_at: state.lastSeenAt ? state.lastSeenAt.toISOString() : null,
      updated_at: updatedAt,
    }
    const { error } = await supabase
      .from(this.table)
      .upsert(row, { onConflict: `user_id,${this.idColumn}` })
    if (error) throw error
  }
}
