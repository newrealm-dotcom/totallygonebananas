-- Cuisine names for schema.org recipeCuisine. Stored on the recipe, not shown on the public page.

create table if not exists public.recipe_cuisines (
  name text primary key
    check (char_length(name) >= 2 and char_length(name) <= 40),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.recipe_cuisines is
  'Cuisine names editors can assign to a recipe. Emitted as recipeCuisine in JSON-LD.';

insert into public.recipe_cuisines (name, sort_order) values
  ('American', 0),
  ('Southern', 1),
  ('Caribbean', 2),
  ('Mexican', 3),
  ('Filipino', 4),
  ('Indian', 5),
  ('Thai', 6)
on conflict (name) do nothing;

alter table public.recipes
  add column if not exists cuisine text not null default 'American';

comment on column public.recipes.cuisine is
  'Region for schema.org recipeCuisine. Defaults to American. Not rendered on the public page.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_cuisine_fkey'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_cuisine_fkey
      foreign key (cuisine) references public.recipe_cuisines (name)
      on update cascade
      on delete restrict;
  end if;
end $$;

create index if not exists recipes_cuisine_idx on public.recipes (cuisine);

alter table public.recipe_cuisines enable row level security;

drop policy if exists "Recipe cuisines are public" on public.recipe_cuisines;
create policy "Recipe cuisines are public" on public.recipe_cuisines
  for select using (true);

drop policy if exists "Editors manage recipe cuisines" on public.recipe_cuisines;
create policy "Editors manage recipe cuisines" on public.recipe_cuisines
  for all to authenticated
  using (public.is_editor())
  with check (public.is_editor());

grant select, insert, update, delete
on table public.recipe_cuisines
to anon, authenticated, service_role;
