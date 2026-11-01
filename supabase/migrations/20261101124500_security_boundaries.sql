-- Anonymous clients may read recipe cards, not the recipe body.
-- Unpublished recipe files are not world-readable.
-- Editor policies require the same authenticator level as admins.
-- OAuth tokens stay on the server.

-- Table-level SELECT overrides a column revoke, so replace anon's table grant
-- with an explicit card-column grant. Signed-in roles keep the full table grant.
revoke select on table public.recipes from anon;

grant select (
  id, slug, title, description, emoji, total_minutes, time_note, servings,
  difficulty, tags, cover_path, status, author_id, created_at, updated_at,
  published_at, referred_by, adapted_from_name, adapted_from_url, categories, cuisine
) on table public.recipes to anon;

create or replace function public.current_role_is(roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = any (roles)
      and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
  );
$$;

revoke all on function public.current_role_is(public.user_role[]) from public, anon;
grant execute on function public.current_role_is(public.user_role[]) to authenticated, service_role;

-- Anonymous clients cannot select the search vector (it contains ingredient text).
create or replace function public.published_recipe_ids_matching(query text)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.recipes
  where status = 'published'
    and char_length(query) between 1 and 100
    and search @@ websearch_to_tsquery('english', query);
$$;

revoke all on function public.published_recipe_ids_matching(text) from public;
grant execute on function public.published_recipe_ids_matching(text) to anon, authenticated, service_role;

-- True when a storage object name is a published cover, gallery file, or step image.
create or replace function public.recipe_storage_path_is_published(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.recipes r
    where r.status = 'published'
      and (
        r.cover_path = object_name
        or exists (
          select 1
          from public.recipe_media m
          where m.recipe_id = r.id
            and m.path = object_name
        )
        or exists (
          select 1
          from jsonb_path_query(coalesce(r.steps, '[]'::jsonb), '$.**.path') as found(value)
          where found.value #>> '{}' = object_name
        )
      )
  );
$$;

revoke all on function public.recipe_storage_path_is_published(text) from public, anon, authenticated;
grant execute on function public.recipe_storage_path_is_published(text) to service_role;

update storage.buckets
set public = false
where id = 'recipe-media';

drop policy if exists "Public read recipe media and avatars" on storage.objects;
drop policy if exists "Public read avatars" on storage.objects;
drop policy if exists "Read recipe media when published, owned, or editor" on storage.objects;

create policy "Public read avatars"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "Read recipe media when published, owned, or editor"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'recipe-media'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or public.is_editor()
      or exists (
        select 1
        from public.recipes r
        where r.status = 'published'
          and r.cover_path = name
      )
      or exists (
        select 1
        from public.recipe_media m
        join public.recipes r on r.id = m.recipe_id
        where r.status = 'published'
          and m.path = name
      )
    )
  );

revoke all on table public.social_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.social_connections to service_role;
