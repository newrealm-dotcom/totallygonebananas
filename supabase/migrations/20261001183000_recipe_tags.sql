-- Active recipe tags for forms and /recipes filters.
create table if not exists public.recipe_tags (
  name text primary key
    check (char_length(name) >= 2 and char_length(name) <= 24),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.recipe_tags is 'Active recipe tags for forms and public filters. Recipes still store tags as text[].';

insert into public.recipe_tags (name, sort_order) values
  ('vegan', 0),
  ('gluten-free', 1),
  ('dairy-free', 2),
  ('kid-friendly', 3),
  ('no added sugar', 4),
  ('quick', 5)
on conflict (name) do nothing;

alter table public.recipe_tags enable row level security;

drop policy if exists "Recipe tags are public" on public.recipe_tags;
create policy "Recipe tags are public" on public.recipe_tags
  for select using (true);

drop policy if exists "Editors manage recipe tags" on public.recipe_tags;
create policy "Editors manage recipe tags" on public.recipe_tags
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

grant select on public.recipe_tags to anon, authenticated;
grant all on public.recipe_tags to authenticated;
