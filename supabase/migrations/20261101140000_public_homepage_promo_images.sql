-- Homepage promo images share the private recipe-media bucket.
-- The active promo image is public. Unused uploads stay private.

create index if not exists homepage_promo_image_path_idx
  on public.homepage_promo (image_path)
  where image_path is not null
    and image_path !~ '^/'
    and image_path !~ '^https?://';

create or replace function public.homepage_promo_path_is_public(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.homepage_promo p
    where p.image_path = object_name
  );
$$;

revoke all on function public.homepage_promo_path_is_public(text) from public, anon, authenticated;
grant execute on function public.homepage_promo_path_is_public(text) to service_role;

drop policy if exists "Public read homepage promo images" on storage.objects;

create policy "Public read homepage promo images"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'recipe-media'
    and exists (
      select 1
      from public.homepage_promo p
      where p.image_path = name
    )
  );
