-- Allow Pinterest in the auto-share log, and store connected Pinterest credentials.

alter table public.social_posts
  drop constraint if exists social_posts_network_check;

alter table public.social_posts
  add constraint social_posts_network_check
  check (network = any (array['facebook'::text, 'instagram'::text, 'twitter'::text, 'pinterest'::text]));

comment on table public.social_posts is
  'Facebook/Instagram/X/Pinterest auto-share log. The unique key stops repeat posts on republish.';

create table if not exists public.social_connections (
  network text primary key check (network = any (array['pinterest'::text])),
  access_token text not null,
  refresh_token text,
  board_id text,
  token_expires_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.social_connections is
  'OAuth credentials for auto-share networks. Editors can read/refresh; only admins connect or disconnect.';

alter table public.social_connections enable row level security;

drop policy if exists social_connections_select_editors on public.social_connections;
drop policy if exists social_connections_write_admins on public.social_connections;
drop policy if exists social_connections_insert_admins on public.social_connections;
drop policy if exists social_connections_delete_admins on public.social_connections;
drop policy if exists social_connections_update_editors on public.social_connections;

create policy social_connections_select_editors
  on public.social_connections for select to authenticated
  using (public.is_editor());

create policy social_connections_insert_admins
  on public.social_connections for insert to authenticated
  with check (public.current_role_is(array['admin']::public.user_role[]));

create policy social_connections_delete_admins
  on public.social_connections for delete to authenticated
  using (public.current_role_is(array['admin']::public.user_role[]));

create policy social_connections_update_editors
  on public.social_connections for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

grant select, insert, update, delete on public.social_connections to authenticated;
