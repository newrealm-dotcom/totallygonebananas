-- Ingredient lists become titled groups (jsonb), so a recipe can include
-- e.g. batter ingredients plus a separately titled frosting list.
-- Legacy text[] rows migrate into a single untitled group.

drop index if exists public.recipes_search_idx;
alter table public.recipes drop column if exists search;

alter table public.recipes drop constraint if exists recipes_ingredients_check;

alter table public.recipes
  alter column ingredients drop default;

alter table public.recipes
  alter column ingredients type jsonb
  using (
    case
      when ingredients is null or cardinality(ingredients) = 0
        then '[{"title":"","items":[]}]'::jsonb
      else jsonb_build_array(
        jsonb_build_object('title', '', 'items', to_jsonb(ingredients))
      )
    end
  );

alter table public.recipes
  alter column ingredients set default '[{"title":"","items":[]}]'::jsonb;

alter table public.recipes
  alter column ingredients set not null;

alter table public.recipes
  add constraint recipes_ingredients_is_array
  check (jsonb_typeof(ingredients) = 'array');

alter table public.recipes
  add constraint recipes_ingredients_group_count
  check (jsonb_array_length(ingredients) >= 1 and jsonb_array_length(ingredients) <= 12);

comment on column public.recipes.ingredients is
  'Array of { title: string, items: string[] }. Title may be empty for the main list.';

create or replace function public.ingredient_groups_to_string(groups jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    (
      select string_agg(
        trim(
          both ' '
          from coalesce(g->>'title', '') || ' ' || coalesce(
            (
              select string_agg(item, ' ')
              from jsonb_array_elements_text(coalesce(g->'items', '[]'::jsonb)) as item
            ),
            ''
          )
        ),
        ' '
      )
      from jsonb_array_elements(coalesce(groups, '[]'::jsonb)) as g
    ),
    ''
  );
$$;

alter table public.recipes
  add column search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', public.ingredient_groups_to_string(ingredients)), 'C')
  ) stored;

create index recipes_search_idx on public.recipes using gin (search);
