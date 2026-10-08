-- Equipment lines may be { text, url } objects as well as plain strings.
-- Convert the existing text[] column to jsonb and backfill links as empty.

alter table public.recipes
  add column if not exists equipment_json jsonb;

update public.recipes
set equipment_json = coalesce(
  (
    select jsonb_agg(jsonb_build_object('text', trim(e), 'url', ''))
    from unnest(equipment) as e
    where nullif(trim(e), '') is not null
  ),
  '[]'::jsonb
);

alter table public.recipes
  drop column equipment;

alter table public.recipes
  rename column equipment_json to equipment;

alter table public.recipes
  alter column equipment set default '[]'::jsonb,
  alter column equipment set not null;

alter table public.recipes
  add constraint recipes_equipment_len_check
  check (jsonb_typeof(equipment) = 'array' and jsonb_array_length(equipment) <= 40);

comment on column public.recipes.equipment is
  'Array of string | { text: string, url: string }. url is an optional http(s) link shown before ingredients.';
