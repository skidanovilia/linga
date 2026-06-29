// The one persistence boundary for challenges. The challenge engine stays purely
// in-memory; the durable state is per-item: which challenges a user has passed,
// kept in `challenge_progress`. A row present = passed (cleared); a row absent =
// not passed (still in the queue) — the same "absence = unseen" shape the SRS
// store uses for `vocab_progress`. Like that store this writes directly under RLS
// — there is no challenge RPC and no box/due/review schedule.

import { supabase } from '../../data/supabase'

/** Loads a user's passed challenges and records new passes / replay resets. */
export interface ChallengeProgressStore {
  /** All challenge ids this user has passed. RLS scopes rows to the user. */
  loadPassed(): Promise<Set<string>>
  /** Persist one challenge as passed (upsert; absent row = not passed). */
  markPassed(challengeId: string): Promise<void>
  /** Replay reset: delete this user's progress for the given module challenges. */
  resetModule(challengeIds: string[]): Promise<void>
}

interface ProgressRow {
  challenge_id: string
}

export class SupabaseChallengeProgressStore implements ChallengeProgressStore {
  constructor(private readonly userId: string) {}

  async loadPassed(): Promise<Set<string>> {
    const { data, error } = await supabase.from('challenge_progress').select('challenge_id')
    if (error) throw error
    return new Set((data as ProgressRow[]).map((row) => row.challenge_id))
  }

  async markPassed(challengeId: string): Promise<void> {
    // passed_at is set explicitly so a re-pass refreshes it — the table default
    // only fires on insert, not on the conflict update.
    const row = {
      user_id: this.userId,
      challenge_id: challengeId,
      passed_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('challenge_progress')
      .upsert(row, { onConflict: 'user_id,challenge_id' })
    if (error) throw error
  }

  async resetModule(challengeIds: string[]): Promise<void> {
    if (challengeIds.length === 0) return
    // RLS already scopes deletes to this user; the user_id filter is explicit.
    const { error } = await supabase
      .from('challenge_progress')
      .delete()
      .eq('user_id', this.userId)
      .in('challenge_id', challengeIds)
    if (error) throw error
  }
}
