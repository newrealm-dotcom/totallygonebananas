-- Supabase stops auto-granting Data API access to new public tables on 2026-10-30.
-- Keep the current project behavior explicit for fresh resets and preview branches.

grant select, insert, update, delete
on table
  public.blog_categories,
  public.categories,
  public.cook_logs,
  public.homepage_promo,
  public.newsletter_signups,
  public.post_comments,
  public.posts,
  public.profiles,
  public.recipe_media,
  public.recipe_tags,
  public.recipes,
  public.saves,
  public.social_connections,
  public.social_posts
to anon, authenticated, service_role;

grant usage, select
on all sequences in schema public
to anon, authenticated, service_role;
