-- Published blog and Our Faves covers share the private recipe-media bucket.
-- A published post cover is public. Draft covers stay private.

create index if not exists posts_published_cover_path_idx
  on public.posts (cover_path)
  where status = 'published' and cover_path is not null;

create or replace function public.post_cover_path_is_published(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    where p.status = 'published'
      and p.cover_path = object_name
  );
$$;

revoke all on function public.post_cover_path_is_published(text) from public, anon, authenticated;
grant execute on function public.post_cover_path_is_published(text) to service_role;

drop policy if exists "Public read published post covers" on storage.objects;

create policy "Public read published post covers"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'recipe-media'
    and exists (
      select 1
      from public.posts p
      where p.status = 'published'
        and p.cover_path = name
    )
  );
