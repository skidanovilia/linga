-- Widen the challenge `type` check constraint to allow the new `translate`
-- challenge type (Russian prompt → full Georgian translation typed from
-- scratch). `translate` reuses the exact `data` shape of `order`, so nothing
-- else changes: the inline-named `challenges_type_check` is dropped and
-- recreated with the extra value, existing rows stay valid, and `import_units`
-- round-trips a `translate` row's jsonb untouched.

alter table public.challenges drop constraint if exists challenges_type_check;
alter table public.challenges add constraint challenges_type_check
  check (type in ('fill_choice', 'order', 'fill_type', 'translate'));
