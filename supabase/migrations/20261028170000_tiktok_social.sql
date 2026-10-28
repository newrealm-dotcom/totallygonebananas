-- Allow TikTok in the auto-share log and in stored OAuth connections.

alter table public.social_posts
  drop constraint if exists social_posts_network_check;

alter table public.social_posts
  add constraint social_posts_network_check
  check (network = any (array['facebook'::text, 'instagram'::text, 'twitter'::text, 'pinterest'::text, 'tiktok'::text]));

comment on table public.social_posts is
  'Facebook/Instagram/X/Pinterest/TikTok auto-share log. The unique key stops repeat posts on republish.';

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.social_connections'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%network%'
  loop
    execute format('alter table public.social_connections drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.social_connections
  add constraint social_connections_network_check
  check (network = any (array['pinterest'::text, 'tiktok'::text]));
