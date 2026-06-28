-- Spaced-repetition progress: per-user state layered additively on top of the
-- read-only content (units / vocab / challenges, unchanged). Two shelves -> two
-- tables, each FK'd to its content table. The DB stays dumb about scheduling:
-- there is no grade RPC; the client computes every box transition and due date
-- and persists by upserting the row below. Absence of a row = a new item
-- (box 0, due now); a row appears only once an item is first answered.

-- One progress row per (user, vocab card).
create table public.vocab_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  vocab_id     uuid not null references public.vocab (id) on delete cascade,
  box          int  not null default 1,
  due_at       timestamptz not null default now(),
  reps         int  not null default 0,
  lapses       int  not null default 0,
  last_result  text check (last_result in ('correct', 'wrong')),
  last_seen_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, vocab_id)
);

-- One progress row per (user, challenge).
create table public.challenge_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  box          int  not null default 1,
  due_at       timestamptz not null default now(),
  reps         int  not null default 0,
  lapses       int  not null default 0,
  last_result  text check (last_result in ('correct', 'wrong')),
  last_seen_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

-- A launch loads one user's due/overdue items ordered by due_at.
create index on public.vocab_progress (user_id, due_at);
create index on public.challenge_progress (user_id, due_at);

-- Per-user isolation: each user reads and writes only their own rows. Content
-- stays public-read (see the init migration); progress is private.
alter table public.vocab_progress     enable row level security;
alter table public.challenge_progress enable row level security;

create policy "own vocab_progress" on public.vocab_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own challenge_progress" on public.challenge_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RLS decides which rows are visible, but the role still needs the table-level
-- privilege. Only signed-in users have progress.
grant select, insert, update, delete
  on public.vocab_progress, public.challenge_progress to authenticated;
