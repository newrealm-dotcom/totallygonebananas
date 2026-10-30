# Security Audit

Date: 2026-10-30

Scope: local source review, dependency audit, and Supabase security advisors. I did not run Cloudflare's external AI security audit from a browser.

## High Risk

### Dependency audit is now clean

`pnpm audit --audit-level moderate` now reports no known vulnerabilities after upgrading `next` to `16.4.1`, `eslint-config-next` to `16.4.1`, and `zod` to `4.6.7`.

Files:

- `package.json`
- `pnpm-lock.yaml`

### Blog post rendering intentionally executes admin-authored scripts

`src/components/HtmlWithScripts.tsx` reinserts `<script>` tags from blog body HTML. That matches the current admin-content model, but it means any compromised editor/admin account can publish executable JavaScript to public blog pages.

Files:

- `src/components/HtmlWithScripts.tsx`
- `src/app/blog/[slug]/page.tsx`
- `src/lib/render-post-markdown.ts`

Fix: keep this only if script-capable blog posts are required. Otherwise sanitize blog HTML like recipe notes, or allow scripts only through a specific reviewed embed component.

### Supabase advisor flags callable `SECURITY DEFINER` role helper

Supabase reports `public.current_role_is(roles public.user_role[])` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via RPC. The function appears intended for RLS role checks, but direct execution is unnecessary surface area unless the app intentionally exposes it.

Files:

- `supabase/migrations/20260927000000_init.sql`
- `supabase/migrations/20261029225000_admin_mfa_and_function_hardening.sql`
- `supabase/migrations/20261029230500_revoke_security_definer_public_execute.sql`

Fix: revoke direct `EXECUTE` from `authenticated` if policies still work, or move the helper out of the exposed schema.

## Medium Risk

### OAuth tokens are stored in a table readable by editors

`public.social_connections` stores Pinterest/TikTok access tokens and refresh tokens. RLS allows editors to select and update rows, while only admins insert/delete. This means every editor can read social tokens via the Data API if they have a session.

Files:

- `supabase/migrations/20261008210000_pinterest_social.sql`
- `supabase/migrations/20261028170000_tiktok_social.sql`
- `src/lib/social/pinterest.ts`
- `src/lib/social/tiktok.ts`

Fix: restrict token reads to service role/server-only code. If editors need connection status, expose a redacted view or server action.

### Rate limiting fails open when service role configuration is missing

`src/lib/rate-limit.ts` allows traffic when `SUPABASE_SERVICE_ROLE_KEY` is missing or the check errors. That keeps the site available, but login, server actions, and API routes lose abuse protection during misconfiguration or database issues.

File:

- `src/lib/rate-limit.ts`

Fix: confirm production has `SUPABASE_SERVICE_ROLE_KEY`; consider fail-closed for auth-sensitive endpoints, or add Vercel/edge/WAF rate limits as a backup.

### Leaked password protection is disabled

Supabase Auth advisor reports leaked password protection is disabled.

Fix: enable leaked password protection in Supabase Auth settings.

## Lower Risk / Positive Findings

- Server actions validate request bodies with Zod before writes.
- Member recipe notes are sanitized through DOMPurify before display.
- Recipe and media write paths verify ownership/folder paths before saving.
- Admin role elevation now checks MFA assurance level for admin users.
- CSP is set through `src/proxy.ts` with a nonce for inline scripts.
- Turnstile is checked for non-editor recipe submission and login flows.
