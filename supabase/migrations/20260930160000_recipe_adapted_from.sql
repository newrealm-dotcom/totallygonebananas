-- Optional source credit for adapted recipes.
alter table public.recipes
  add column if not exists adapted_from_name text
  check (adapted_from_name is null or char_length(adapted_from_name) between 1 and 120);

alter table public.recipes
  add column if not exists adapted_from_url text
  check (
    adapted_from_url is null
    or (
      char_length(adapted_from_url) between 1 and 500
      and adapted_from_url ~* '^https?://'
    )
  );

comment on column public.recipes.adapted_from_name is
  'Optional display name for the recipe this was adapted from.';

comment on column public.recipes.adapted_from_url is
  'Optional http(s) URL for the adapted-from source; opens in a new tab on the recipe page.';
