-- Linga schema: Units -> (Vocab + Challenges). Each row has its own UUID id.
-- Challenge `data` is jsonb so the per-type shape (fill_choice / order / fill_type)
-- round-trips unchanged into the frontend.

create table public.units (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create table public.vocab (
  id      uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  ka      text not null,
  ru      text not null
);

create table public.challenges (
  id      uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  type    text not null check (type in ('fill_choice', 'order', 'fill_type')),
  data    jsonb not null
);

create index on public.vocab (unit_id);
create index on public.challenges (unit_id);

-- Public read-only content: anon may SELECT; all writes go through the import
-- RPC below (security definer, restricted to service_role).
alter table public.units enable row level security;
alter table public.vocab enable row level security;
alter table public.challenges enable row level security;

create policy "public read units" on public.units
  for select using (true);
create policy "public read vocab" on public.vocab
  for select using (true);
create policy "public read challenges" on public.challenges
  for select using (true);

-- RLS policies decide which rows are visible, but the role still needs the
-- table-level privilege. Grant read to the API roles.
grant select on public.units, public.vocab, public.challenges to anon, authenticated;

-- Batch import as a single HTTP POST. Exposed by PostgREST at
--   POST /rest/v1/rpc/import_units
-- The function has a single *unnamed* jsonb parameter, so PostgREST passes the
-- raw request body straight to it. POST the units.json array as-is (a top-level
-- list of { title, vocab:[{ka,ru}], challenges:[{type,data}] }) — no wrapper
-- object, no special headers. Returns the number of units imported. Appends to
-- existing data; run `supabase db reset` to start from an empty database.
create or replace function public.import_units(jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  payload     jsonb := $1;
  u           jsonb;
  new_unit_id uuid;
  next_pos    int;
  n           int := 0;
begin
  select coalesce(max(position), -1) + 1 into next_pos from public.units;

  for u in select value from jsonb_array_elements(payload)
  loop
    insert into public.units (title, position)
    values (u ->> 'title', next_pos)
    returning id into new_unit_id;
    next_pos := next_pos + 1;

    insert into public.vocab (unit_id, ka, ru)
    select new_unit_id, v ->> 'ka', v ->> 'ru'
    from jsonb_array_elements(coalesce(u -> 'vocab', '[]'::jsonb)) as v;

    insert into public.challenges (unit_id, type, data)
    select new_unit_id, c ->> 'type', c -> 'data'
    from jsonb_array_elements(coalesce(u -> 'challenges', '[]'::jsonb)) as c;

    n := n + 1;
  end loop;

  return n;
end;
$$;

-- Only the service_role key may run the import; anon is read-only.
revoke execute on function public.import_units(jsonb) from public, anon;
grant  execute on function public.import_units(jsonb) to service_role;
