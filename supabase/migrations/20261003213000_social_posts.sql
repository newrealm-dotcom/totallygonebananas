-- One row per network per published recipe/post, so each is auto-shared at most once.
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('recipe', 'post')),
  target_id uuid not null,
  network text not null check (network in ('facebook', 'instagram')),
  status text not null default 'sending' check (status in ('sending', 'posted', 'failed')),
  external_id text,
  error text check (char_length(error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, target_id, network)
);

comment on table public.social_posts is 'Facebook/Instagram auto-share log. The unique key stops repeat posts on republish.';

alter table public.social_posts enable row level security;

create policy "Editors manage social posts"
  on public.social_posts for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

grant select, insert, update, delete on public.social_posts to authenticated;
