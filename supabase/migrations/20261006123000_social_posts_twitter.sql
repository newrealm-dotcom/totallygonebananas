-- Allow auto-share logs for X (Twitter) alongside Facebook and Instagram.
alter table public.social_posts
  drop constraint if exists social_posts_network_check;

alter table public.social_posts
  add constraint social_posts_network_check
  check (network = any (array['facebook'::text, 'instagram'::text, 'twitter'::text]));

comment on table public.social_posts is 'Facebook/Instagram/X auto-share log. The unique key stops repeat posts on republish.';
