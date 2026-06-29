-- Makes challenge progress durable per item, mirroring memo cards' vocab_progress
-- ("new = no row"). Here "passed = row present, not-passed = no row": entering a
-- module's challenges rebuilds the queue from exactly the challenges with no row.
-- Still no box/due, no per-item review schedule, no RPC — just a persisted
-- "passed" fact instead of in-memory queue state.

-- One row per (user, challenge) means that challenge is PASSED (cleared).
-- Absence of a row = not passed yet (still in the queue).
create table public.challenge_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  passed_at    timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

create index on public.challenge_progress (user_id);

-- Per-user isolation: each user reads and writes only their own progress.
alter table public.challenge_progress enable row level security;
create policy "own challenge_progress" on public.challenge_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RLS decides which rows are visible, but the role still needs the privilege.
grant select, insert, update, delete on public.challenge_progress to authenticated;

-- Completion is now derived from challenge_progress (a module is complete when all
-- of its challenges have a row). The module-level cache is no longer authoritative.
drop table if exists public.module_completion;
