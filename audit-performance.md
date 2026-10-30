# Performance Audit

Date: 2026-10-30

Focus screens: homepage, `/recipes`, individual recipe pages, `/blog`, individual blog posts, login/MFA, and admin content forms.

## Highest Impact

### Dependency baseline is now clean

The Next.js dependency advisories from the initial audit were fixed by upgrading to `next@16.4.1`. `pnpm audit --audit-level moderate` now reports no known vulnerabilities.

User impact: deeper performance tuning can now be evaluated from a cleaner framework baseline.

Next step: rerun Lighthouse or field performance checks on production after deployment.

### Recipe detail pages do several sequential reads

`/recipes/[slug]` fetches the recipe, then viewer, categories, ratings, saves, cook logs, and commenter profile names. Some work is parallelized, but the page still has several server/database steps before render.

Files:

- `src/app/recipes/[slug]/page.tsx`
- `src/lib/queries.ts`

User impact: individual recipes are a core screen; latency is most visible here, especially on mobile.

Fix: consolidate recipe detail data into fewer queries or a Postgres view/RPC for public detail pages. Keep admin/owner-only data separate.

### Supabase performance advisors flagged RLS and indexes

Supabase reports:

- `public.saves.recipe_id` foreign key has no covering index.
- 11 RLS policies call `auth.uid()` or related functions directly instead of using `(select auth.uid())`, which can be re-evaluated per row.
- Several tables have multiple permissive policies for the same role/action.

User impact: the site may feel fine with small data, but recipe lists, saves, comments, and admin screens can slow down as rows grow.

Fix: add the missing `saves(recipe_id)` index, update RLS policies to use initplan-friendly `(select auth.uid())`, and merge duplicate permissive policies where practical.

## Medium Impact

### Large client form can redraw often

`RecipeForm` stores the entire recipe draft in one state object and autosaves it to `localStorage` after edits. Large recipes with many steps/media can cause broad rerenders while typing.

File:

- `src/components/RecipeForm.tsx`

User impact: mobile editing can feel laggy on long recipes.

Fix: split ingredient/step/media sections into memoized child components and keep localized row state where possible.

### Third-party scripts still affect mobile

GTM, Clarity, Grow, Vercel Analytics, and Speed Insights are deferred, which is good. They still add network work and runtime cost after load.

File:

- `src/app/layout.tsx`

User impact: mobile devices can see delayed interaction jank after the first scroll/tap when deferred scripts load.

Fix: verify the minimum required tags in GTM, keep Clarity masked on sensitive screens, and test with mobile CPU throttling.

### Infinite list pages need real e2e coverage

`/blog`, `/recipes`, and `/our-faves` use paginated/infinite grid behavior. No e2e tests exist to confirm first-page counts, filter state, and Load More behavior.

User impact: users may miss content or see duplicate cards if pagination regresses.

Fix: add Playwright tests for first load, filter changes, and repeated Load More taps.

## Lower Impact / Positive Findings

- Local fonts use `display: swap`.
- Static images use Next/Image in many key places.
- Popup and Grow scripts are deferred rather than blocking initial render.
- Recipe detail page avoids static caching because visitor-specific signup gating is part of the behavior.
