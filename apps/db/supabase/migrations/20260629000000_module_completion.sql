-- Splits review into two engines. Memo cards keep their per-item Leitner state
-- (vocab_progress, unchanged). Challenges move to an ephemeral clear-the-queue
-- model: no per-item review state, no box/due, no RPC. The only durable
-- challenge state is "this user has cleared this module at least once".

-- Challenges no longer persist per-item review state. Dropping the table also
-- drops its index and RLS policy. vocab_progress keeps its own grant (the
-- combined grant in the previous migration applied per-table).
drop table if exists public.challenge_progress;

-- One row per (user, module) once the user empties that module's challenge
-- queue. Replaying a completed module refreshes completed_at via upsert; the
-- row is never removed by the app. Direct upsert under RLS — no RPC.
create table public.module_completion (
  user_id      uuid not null references auth.users (id) on delete cascade,
  unit_id      uuid not null references public.units (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);

-- Per-user isolation: each user reads and writes only their own completions.
alter table public.module_completion enable row level security;
create policy "own module_completion" on public.module_completion
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RLS decides which rows are visible, but the role still needs the privilege.
grant select, insert, update, delete on public.module_completion to authenticated;
