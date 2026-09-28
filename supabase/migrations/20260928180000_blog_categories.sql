-- Blog categories are separate from recipe categories (public.categories).
create table if not exists public.blog_categories (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null unique check (char_length(name) >= 2 and char_length(name) <= 40),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.blog_categories is 'Categories for blog posts only. Never use public.categories (recipe categories) for posts.';

alter table public.posts
  add column if not exists categories text[] not null default '{}'
  check (cardinality(categories) <= 12);

comment on column public.posts.categories is 'Blog category ids from blog_categories. Not recipe category ids.';

create index if not exists posts_categories_gin on public.posts using gin (categories);

alter table public.blog_categories enable row level security;

drop policy if exists "Blog categories are public" on public.blog_categories;
create policy "Blog categories are public" on public.blog_categories
  for select using (true);

drop policy if exists "Editors manage blog categories" on public.blog_categories;
create policy "Editors manage blog categories" on public.blog_categories
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

grant select on public.blog_categories to anon, authenticated;
grant all on public.blog_categories to authenticated;
