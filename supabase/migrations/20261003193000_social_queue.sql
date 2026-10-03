-- Manual social posting queue for Facebook and Instagram.

create table public.social_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('recipe', 'post')),
  target_id uuid not null,
  slug text not null,
  title text not null check (char_length(title) between 1 and 160),
  caption text not null check (char_length(caption) between 1 and 2200),
  url text not null,
  cover_path text,
  platforms text[] not null default array['facebook', 'instagram']::text[],
  status text not null default 'pending' check (status in ('pending', 'posted', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  posted_at timestamptz
);

create unique index social_queue_target_idx on public.social_queue (kind, target_id);
create index social_queue_status_created_idx on public.social_queue (status, created_at desc);

create or replace function public.social_queue_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status = 'posted' and new.posted_at is null then
    new.posted_at := now();
  end if;
  if new.status <> 'posted' then
    new.posted_at := null;
  end if;
  return new;
end;
$$;

create trigger social_queue_before_write
  before insert or update on public.social_queue
  for each row execute function public.social_queue_before_write();

alter table public.social_queue enable row level security;

create policy "Editors read social queue"
  on public.social_queue for select to authenticated
  using (public.is_editor());

create policy "Editors create social queue"
  on public.social_queue for insert to authenticated
  with check (public.is_editor());

create policy "Editors update social queue"
  on public.social_queue for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

create policy "Editors delete social queue"
  on public.social_queue for delete to authenticated
  using (public.is_editor());
