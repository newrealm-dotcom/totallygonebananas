-- Moderated comments on blog posts. Public only sees approved rows.

create type public.post_comment_status as enum ('pending', 'approved', 'denied');

create table public.post_comments (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts (id) on delete cascade,
  author_id     uuid references public.profiles (id) on delete set null,
  display_name  text not null check (char_length(display_name) between 2 and 80),
  body          text not null check (char_length(body) between 2 and 4000),
  status        public.post_comment_status not null default 'pending',
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);

comment on table public.post_comments is
  'Blog post comments. New rows start pending and only appear on the site after an editor approves them.';

create index post_comments_post_approved_idx
  on public.post_comments (post_id, created_at)
  where status = 'approved';

create index post_comments_pending_idx
  on public.post_comments (created_at)
  where status = 'pending';

alter table public.post_comments enable row level security;

create policy "Approved comments are public; editors see all"
  on public.post_comments for select
  using (status = 'approved' or public.is_editor());

create policy "Anyone can submit a pending comment"
  on public.post_comments for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and (author_id is null or author_id = (select auth.uid()))
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.status = 'published'
    )
  );

create policy "Editors review comments"
  on public.post_comments for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

create policy "Editors delete comments"
  on public.post_comments for delete
  to authenticated
  using (public.is_editor());

grant select, insert on public.post_comments to anon, authenticated;
grant update, delete on public.post_comments to authenticated;
