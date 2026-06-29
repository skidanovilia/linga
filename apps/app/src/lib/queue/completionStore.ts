// The one persistence boundary for challenges. The challenge engine is purely
// in-memory; the *only* durable state is which modules a user has cleared, kept
// in `module_completion`. Like the SRS store this writes directly under RLS —
// there is no challenge RPC and no per-item progress table.

import { supabase } from '../../data/supabase'

/** Loads a user's completed modules and records new completions. */
export interface CompletionStore {
  /** Unit ids this user has cleared at least once. RLS scopes rows to the user. */
  loadCompleted(): Promise<Set<string>>
  /** Mark a module completed (insert-or-refresh completed_at). */
  markCompleted(unitId: string): Promise<void>
}

interface CompletionRow {
  unit_id: string
}

export class SupabaseCompletionStore implements CompletionStore {
  constructor(private readonly userId: string) {}

  async loadCompleted(): Promise<Set<string>> {
    const { data, error } = await supabase.from('module_completion').select('unit_id')
    if (error) throw error
    return new Set((data as CompletionRow[]).map((row) => row.unit_id))
  }

  async markCompleted(unitId: string): Promise<void> {
    // completed_at is set explicitly so a replay refreshes it — the table
    // default only fires on insert, not on the conflict update.
    const row = {
      user_id: this.userId,
      unit_id: unitId,
      completed_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('module_completion')
      .upsert(row, { onConflict: 'user_id,unit_id' })
    if (error) throw error
  }
}
