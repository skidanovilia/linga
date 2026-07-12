// The durable, write-once side of challenge completion. Separate from
// `challenge_progress` (per-item, resettable on replay): a row in `unit_completion`
// means "this user passed every challenge in this unit at least once", and it is
// never removed or changed. There is intentionally NO clear/delete method here —
// the badge is permanent, so the capability must not exist. Like the progress
// store this writes directly under RLS (no RPC).

import { supabase } from '../../data/supabase'

/** Loads a user's completed units and records new completions (write-once). */
export interface UnitCompletionStore {
  /** Every unit id this user has ever completed. RLS scopes rows to the user. */
  loadCompletedUnits(): Promise<Set<string>>
  /** Write-once: record a unit as completed. Idempotent (on conflict do nothing),
   *  so re-completing never moves the original completed_at. No clear counterpart. */
  markUnitCompleted(unitId: string): Promise<void>
}

interface CompletionRow {
  unit_id: string
}

export class SupabaseUnitCompletionStore implements UnitCompletionStore {
  constructor(private readonly userId: string) {}

  async loadCompletedUnits(): Promise<Set<string>> {
    const { data, error } = await supabase.from('unit_completion').select('unit_id')
    if (error) throw error
    return new Set((data as CompletionRow[]).map((row) => row.unit_id))
  }

  async markUnitCompleted(unitId: string): Promise<void> {
    // `ignoreDuplicates: true` makes PostgREST emit INSERT ... ON CONFLICT DO
    // NOTHING, which needs only the INSERT privilege (no UPDATE) — matching the
    // select+insert-only grant. completed_at is left to the table default so it
    // is stamped on the first insert only and never moved on a repeat.
    const row = { user_id: this.userId, unit_id: unitId }
    const { error } = await supabase
      .from('unit_completion')
      .upsert(row, { onConflict: 'user_id,unit_id', ignoreDuplicates: true })
    if (error) throw error
  }
}
