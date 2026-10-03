-- Recipes can belong to multiple categories (ids from public.categories).
alter table public.recipes
  add column if not exists categories text[] not null default '{}'
  check (cardinality(categories) <= 12);

comment on column public.recipes.categories is 'Recipe category ids from public.categories. Replaces category_id.';

-- Backfill from the legacy single FK.
update public.recipes
set categories = array[category_id]
where category_id is not null
  and (categories = '{}' or categories is null);

create index if not exists recipes_categories_gin on public.recipes using gin (categories);

drop index if exists recipes_category_idx;

alter table public.recipes
  drop constraint if exists recipes_category_id_fkey;

alter table public.recipes
  drop column if exists category_id;
