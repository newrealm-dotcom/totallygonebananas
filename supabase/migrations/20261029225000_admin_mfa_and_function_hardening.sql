-- Require admins to complete MFA before admin/editor policies treat them as elevated.
-- Editors keep their current access model.

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
      and (
        role <> 'admin'::public.user_role
        or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
      )
  );
$$;

create or replace function public.is_editor()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.current_role_is(array['editor', 'admin']::public.user_role[]);
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null in the SQL editor and for the service role, which are trusted.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.current_role_is(array['admin']::public.user_role[]) then
    new.role := old.role;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.immutable_array_to_string(text[])
returns text
language sql
immutable
set search_path = public
as $$ select array_to_string($1, ' '); $$;

create or replace function public.recipes_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.homepage_promo_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.ingredient_groups_to_string(groups jsonb)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(
    (
      select string_agg(
        trim(
          both ' '
          from coalesce(g->>'title', '') || ' ' || coalesce(
            (
              select string_agg(
                case jsonb_typeof(item)
                  when 'string' then item #>> '{}'
                  when 'object' then coalesce(item->>'text', '')
                  else ''
                end,
                ' '
              )
              from jsonb_array_elements(coalesce(g->'items', '[]'::jsonb)) as item
            ),
            ''
          )
        ),
        ' '
      )
      from jsonb_array_elements(coalesce(groups, '[]'::jsonb)) as g
    ),
    ''
  );
$$;

revoke execute on function public.current_role_is(public.user_role[]) from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.protect_profile_role() from anon, authenticated;
