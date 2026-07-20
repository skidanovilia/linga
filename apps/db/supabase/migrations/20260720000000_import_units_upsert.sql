-- Make the batch importer update-or-append instead of append-only. Each unit
-- gains an optional `id` (a units.id UUID) that discriminates the two paths:
--   • no  "id"  → APPEND a new unit at the next position (unchanged behavior).
--   • with "id" → UPDATE that existing unit: refresh title and REPLACE its content
--                 (vocab + challenges + grammar). The old vocab/challenges are
--                 deleted together with their per-user progress.
-- Same unnamed jsonb signature as before, so the existing revoke/grant still
-- applies. A single payload may mix updates (with id) and appends (without id).
--
-- The unit row itself is preserved on update — its position and its write-once
-- unit_completion badge stay intact; only the title is refreshed (coalesced, so a
-- missing title leaves the old one). Replacing content leaves the badge lit even
-- though the challenge counter reads 0/new_total afterward, since challenge_progress
-- was cleared; resetting the badge on content update would be a separate, deliberate
-- change (not done here).
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
    if u ? 'id' then
      -- ---- UPDATE existing unit --------------------------------------------
      new_unit_id := (u ->> 'id')::uuid;

      -- keep the unit row (its position and its permanent unit_completion badge);
      -- only refresh the title if one is supplied.
      update public.units
        set title = coalesce(u ->> 'title', title)
        where id = new_unit_id;

      -- delete progress FIRST (explicit, so it does not depend on FK cascade),
      -- then the content itself. This wipes ALL users' progress for this unit's
      -- old vocab/challenges — expected, since content is being replaced.
      delete from public.vocab_progress
        where vocab_id in (select id from public.vocab where unit_id = new_unit_id);
      delete from public.challenge_progress
        where challenge_id in (select id from public.challenges where unit_id = new_unit_id);

      delete from public.vocab         where unit_id = new_unit_id;
      delete from public.challenges    where unit_id = new_unit_id;
      delete from public.grammar_pages where unit_id = new_unit_id;
    else
      -- ---- APPEND new unit -------------------------------------------------
      insert into public.units (title, position)
        values (u ->> 'title', next_pos)
        returning id into new_unit_id;
      next_pos := next_pos + 1;
    end if;

    -- ---- (re)insert content for this unit ----------------------------------
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
