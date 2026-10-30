# Architecture Audit

Date: 2026-10-30

Focus: recent auth, recipe save/publish, Supabase grants/RLS, and social auto-posting changes.

## High Risk

### Social posting is coupled directly to publish actions

`saveRecipe`, `reviewRecipe`, and `savePost` call `scheduleSocialShare()` when content first becomes published. The share work is deferred with Next.js `after()`, and `social_posts` prevents duplicate shares per target/network. This is a reasonable first implementation, but it means publishing, queue claiming, network formatting, credential lookup, and external API calls are connected through a single server-action path.

Files:

- `src/actions/recipes.ts`
- `src/actions/posts.ts`
- `src/lib/social/share.ts`
- `src/lib/social/meta.ts`
- `src/lib/social/pinterest.ts`
- `src/lib/social/tiktok.ts`
- `src/lib/social/twitter.ts`

Risk: failed posts are recorded, but there is no independent queue worker, admin retry flow, or test harness. Social delivery depends on the publish request lifecycle and production runtime support for `after()`.

Recommendation: keep `scheduleSocialShare()` as the domain boundary, but move durable retries into an explicit queue/worker or scheduled job. Add an admin retry button against failed `social_posts` rows.

## Medium Risk

### Recipe form owns a lot of business behavior

`src/components/RecipeForm.tsx` handles draft restore, uploads, category/cuisine creation UI, client validation hints, Turnstile state, paste parsing, ingredient/step editing, and submit orchestration. The server action is the authority, which is good, but the component is large enough that regressions are hard to isolate.

Files:

- `src/components/RecipeForm.tsx`
- `src/actions/recipes.ts`
- `src/lib/recipe-form-values.ts`
- `src/lib/validation.ts`

Recommendation: extract client-only subcomponents for ingredients, steps, media, and taxonomy selection. Keep final authorization and persistence in `saveRecipe()`.

### Authorization rules are split between UI, server actions, and RLS

Admin MFA/editor checks happen in page loaders, server actions, helper functions, and Supabase policies. This layered model is good for defense in depth, but the same concept appears in several places and recent failures show it is easy to miss one path.

Files:

- `src/lib/queries.ts`
- `src/app/admin/layout.tsx`
- `src/app/recipes/new/page.tsx`
- `src/app/recipes/[slug]/edit/page.tsx`
- `src/actions/recipes.ts`
- `supabase/migrations/20261029225000_admin_mfa_and_function_hardening.sql`

Recommendation: add tests for admin-without-AAL2, editor, member author, and anonymous access for save, publish, edit, and detail pages.

### Stored HTML has two trust models

Recipe notes are sanitized, but blog post bodies are rendered as trusted admin HTML and scripts are reinserted. This is architecturally coherent only if blog publishing is treated as privileged code publishing.

Files:

- `src/lib/render-post-markdown.ts`
- `src/lib/sanitize-html.ts`
- `src/components/HtmlWithScripts.tsx`

Recommendation: document this trust boundary in admin UI and tests, or replace arbitrary script execution with explicit embed blocks.

## Lower Risk / Good Patterns

- Server actions receive unknown input and validate with Zod.
- Supabase client creation is centralized in `src/lib/supabase`.
- Query helpers in `src/lib/queries.ts` provide shared read paths and request-level caching.
- Social network integrations are isolated under `src/lib/social`.
- Explicit Data API grants are now captured in migrations for resets and preview branches.
