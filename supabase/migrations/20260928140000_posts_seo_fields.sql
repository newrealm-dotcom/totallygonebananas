-- Optional SEO fields for blog posts (display title/excerpt remain separate).
alter table public.posts
  add column if not exists seo_title text,
  add column if not exists meta_description text;

comment on column public.posts.seo_title is 'Optional SEO document title; falls back to title when null.';
comment on column public.posts.meta_description is 'Optional SEO meta description; falls back to excerpt when null.';
