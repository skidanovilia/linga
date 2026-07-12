-- A durable, WRITE-ONCE "this user finished all of unit X's challenges at least
-- once" fact. Distinct from challenge_progress (which is reset on replay, and
-- from which the transient in_progress/completed state is derived): once a row
-- exists here it is NEVER removed or changed, so the badge is permanent even
-- after the challenge counter drops back to 0/total on replay.

-- One row per (user, unit) = that unit's challenges were all passed at least once.
create table public.unit_completion (
  user_id      uuid not null references auth.users (id) on delete cascade,
  unit_id      uuid not null references public.units (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);

create index on public.unit_completion (user_id);

-- Own rows only. SELECT + INSERT are granted, but deliberately NOT update/delete:
-- the badge is permanent, so no policy or grant can remove or change it. This
-- differs from the other per-user tables (single "for all" policy + full grant)
-- on purpose — it is what makes the badge structurally unremovable from the client.
alter table public.unit_completion enable row level security;
create policy "read own unit_completion" on public.unit_completion
  for select using (auth.uid() = user_id);
create policy "insert own unit_completion" on public.unit_completion
  for insert with check (auth.uid() = user_id);
grant select, insert on public.unit_completion to authenticated;
-- deliberately NO delete/update grant or policy.
