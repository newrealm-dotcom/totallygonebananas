# Backend Audit

Date: 2026-10-30

Scope: Supabase migrations and Supabase advisors.

## Advisor Findings

Security advisors:

- Warning: `public.current_role_is(roles public.user_role[])` is a `SECURITY DEFINER` function executable by `authenticated`. Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- Warning: leaked password protection is disabled. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Performance advisors:

- Info: `public.saves` has an unindexed foreign key on `recipe_id`.
- Warning: 11 RLS policies re-evaluate `auth.uid()` or related functions per row.
- Warning: 8 tables have multiple permissive policies for the same role/action.
- Info: 5 indexes are currently unused.

## Table Access Summary

All listed public tables have RLS enabled in migrations unless noted. `20261021173959_explicit_data_api_grants.sql` grants broad Data API table privileges to `anon`, `authenticated`, and `service_role`; row access is therefore controlled by RLS policies.

| Table | Logged-out read | Logged-out write | Authenticated read | Authenticated write |
| --- | --- | --- | --- | --- |
| `profiles` | All profiles | No | All profiles | Own profile; admins can update any profile |
| `categories` | All categories | No | All categories | Editors/admins manage |
| `recipes` | Published recipes | No | Published recipes, own drafts/pending/rejected, editor/admin rows | Signed-in users create own draft/pending; authors edit/delete unpublished; editors/admins manage |
| `recipe_media` | Media visible with visible recipe | No | Media visible with visible recipe | Author/editor recipe managers manage media |
| `saves` | No | No | Own saves only | Own saves only |
| `cook_logs` | Logs on published recipes | No | Logs on published recipes and own logs | Users create/delete own logs; editors moderate deletes |
| `posts` | Published posts | No | Published posts; editors see drafts | Editors/admins create/update/delete |
| `homepage_promo` | Public current promo | No | Public current promo | Editors/admins manage |
| `blog_categories` | Public categories | No | Public categories | Editors/admins manage |
| `recipe_tags` | Public tags | No | Public tags | Editors/admins manage |
| `recipe_cuisines` | Public cuisines | No | Public cuisines | Editors/admins manage |
| `post_comments` | Approved comments, plus editors see all | Anyone can submit pending comments | Approved comments, plus editors see all | Anyone can submit pending comments; editors update/delete |
| `newsletter_signups` | No | Initially open insert, later revoked from anon/authenticated | Editors can read | Inserts revoked from anon/authenticated; server path should use service role |
| `social_posts` | No | No | Editors/admins read/manage | Editors/admins manage |
| `social_connections` | No | No | Editors/admins can read token rows | Editors can update; admins insert/delete |
| `rate_limit_buckets` | No | No | No | Service role only |

Storage:

- `recipe-media` and `avatars` are public buckets for reads.
- Authenticated users can upload/update files in their own folder.
- Authenticated users can delete own files; editors can moderate deletes.

## Risks

### High: social connection tokens are exposed to editors

`social_connections` contains OAuth access and refresh tokens. RLS allows editors to select rows. If editor accounts do not need raw tokens, restrict token reads to service role/server code and provide redacted status through a view or server action.

### Medium: broad Data API grants depend entirely on RLS correctness

The explicit grants migration keeps Supabase Data API access working after the platform change, but it grants table-level CRUD broadly. This is acceptable only because every exposed table needs correct RLS. New migrations must continue enabling RLS and adding explicit grants/policies together.

### Medium: authenticated can execute role helper RPC

Supabase flags `current_role_is` as callable by `authenticated`. If direct RPC access is not required, revoke it and confirm policies still function.

### Medium: newsletter write path changed to server-verified only

`20261029225500_require_server_verified_newsletter_inserts.sql` revokes direct inserts. Confirm `subscribeNewsletter()` uses a privileged server path and Turnstile/rate limits so users can still subscribe while bots cannot write directly.

## What Looks Good

- RLS is enabled on public application tables in migrations.
- Views use `security_invoker` where present.
- Recent migrations revoke public execution from sensitive security-definer functions.
- Rate-limit buckets are service-role only.
- Admin role elevation now requires MFA AAL2 in the role helper.
