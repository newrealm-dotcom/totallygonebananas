-- Tags on blog posts (same catalog as recipe_tags for forms).
alter table public.posts
  add column if not exists tags text[] not null default '{}';

comment on column public.posts.tags is 'Free-form tags; active catalog is public.recipe_tags.';

create index if not exists posts_tags_gin on public.posts using gin (tags);
