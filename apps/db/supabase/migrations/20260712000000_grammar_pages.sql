-- Optional grammar section per unit: an ordered set of markdown "pages". A unit
-- has a section iff it has >= 1 grammar_pages row. Read-only content, like
-- units/vocab/challenges — no per-user state, no progress, no gating.

create table public.grammar_pages (
  id       uuid primary key default gen_random_uuid(),
  unit_id  uuid not null references public.units (id) on delete cascade,
  position int  not null default 0,
  content  text not null            -- markdown for one page
);
create index on public.grammar_pages (unit_id, position);

-- Public read-only content: anon may SELECT; writes go through import_units.
alter table public.grammar_pages enable row level security;
create policy "public read grammar_pages" on public.grammar_pages
  for select using (true);
grant select on public.grammar_pages to anon, authenticated;

-- Extend the batch importer with a fourth, optional insert. Same unnamed jsonb
-- signature (so the existing revoke/grant still applies): each unit may carry an
-- optional `grammar` array of markdown strings; one grammar_pages row per element,
-- position by array index (0-based). Units without the key import exactly as before.
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

    -- Optional grammar section: one row per markdown page, position by index (0-based).
    insert into public.grammar_pages (unit_id, position, content)
    select new_unit_id, (idx - 1)::int, page
    from jsonb_array_elements_text(coalesce(u -> 'grammar', '[]'::jsonb))
         with ordinality as t(page, idx);

    n := n + 1;
  end loop;

  return n;
end;
$$;

-- Only the service_role key may run the import; anon is read-only.
revoke execute on function public.import_units(jsonb) from public, anon;
grant  execute on function public.import_units(jsonb) to service_role;
