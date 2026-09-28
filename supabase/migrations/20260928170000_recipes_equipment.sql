-- Optional equipment list for recipes (shown before ingredients when non-empty).
alter table public.recipes
  add column if not exists equipment text[] not null default '{}'
  check (cardinality(equipment) <= 40);

comment on column public.recipes.equipment is 'Optional numbered list of tools/equipment shown before ingredients.';
