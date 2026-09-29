-- Serving size becomes free-form text (e.g. "1 loaf", "makes 12 muffins", "4").
-- Existing integer values cast to text; the numeric check is dropped.

alter table public.recipes
  drop constraint if exists recipes_servings_check;

alter table public.recipes
  alter column servings type text
  using case
    when servings is null then null
    else servings::text
  end;

alter table public.recipes
  add constraint recipes_servings_length
  check (servings is null or char_length(servings) <= 80);

comment on column public.recipes.servings is
  'Free-form serving size text (e.g. "8", "1 loaf", "makes 12 muffins").';
