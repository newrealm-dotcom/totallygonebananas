# UX and UI Audit

Date: 2026-10-30

Scope: source-level walkthrough of public, auth, profile, recipe, blog, and admin screens. No browser field run was performed.

## High Priority

### No automated e2e coverage for critical user journeys

There are no Playwright, Cypress, Maestro, or Detox tests. The flows most likely to regress are login/MFA, recipe save/publish, recipe detail access, blog publish, social sharing setup, and infinite scroll.

User impact: users find broken forms or missing content before the team does.

Fix: add Playwright tests for the public browse flow, login/MFA, member recipe submission, admin publishing, and Load More behavior.

### Recipe form can be overwhelming on mobile

The recipe editor is feature-rich and large: basics, details, media, equipment, ingredients, steps, adapted-from, tags, cuisines, draft restore, uploads, Turnstile, and publish actions.

Files:

- `src/components/RecipeForm.tsx`
- `src/app/recipes/new/page.tsx`
- `src/app/recipes/[slug]/edit/page.tsx`

User impact: first-time members may abandon recipe submission, especially on a phone.

Fix: test on mobile with long ingredient and step lists. Consider a step-by-step mobile layout or sticky progress navigation.

## Medium Priority

### Button double-tap protection is inconsistent

Some forms disable submit buttons while pending, but not every action button is covered by tests. Risk areas include review buttons, delete buttons, saves, comments, newsletter signup, and OAuth connect/disconnect actions.

Files:

- `src/components/OwnerTools.tsx`
- `src/components/SaveButton.tsx`
- `src/components/PostCommentForm.tsx`
- `src/components/ScrollEngagementPopup.tsx`
- `src/components/TikTokAdmin.tsx`
- `src/components/PinterestAdmin.tsx`

User impact: duplicate submits can create confusing duplicate rows or error messages.

Fix: add pending states and e2e assertions for repeated taps on mobile.

### Loading, empty, and error states vary by screen

Observed source coverage:

- Public lists show cards and Load More behavior, but no automated check proves the empty/filter state.
- Recipe detail has not-found protection and empty ratings text.
- Blog comments show an empty state.
- Admin pages likely rely on server-rendered tables and inline action errors.
- Login/MFA flows have visible error states.

User impact: users may see abrupt empty pages or unclear failures when Supabase or a social API fails.

Fix: standardize empty/loading/error components for list pages and admin panels.

### Scroll popup needs keyboard/focus validation

`ScrollEngagementPopup` opens at 33% scroll, closes on Escape/backdrop/button, and focuses the close button. It does not implement a full focus trap.

File:

- `src/components/ScrollEngagementPopup.tsx`

User impact: keyboard users may tab behind the modal.

Fix: add a focus trap or use a dialog primitive. Add Playwright accessibility checks for open, Escape, backdrop close, and newsletter submit.

## Screen Notes

- Homepage: check sticky header overlap and popup timing on small screens.
- `/recipes`: check filters, empty states, Load More, and card tap targets.
- `/recipes/[slug]`: check signup gate, save, print, made-it form, owner/edit actions, gallery, and long ingredients.
- `/recipes/new` and edit pages: check upload errors, Turnstile errors, draft restore, keyboard overlap, and publish/draft submit states.
- `/blog` and `/our-faves`: check first-page counts, Load More, category/tag filters, and missing cover images.
- `/blog/[slug]`: check embeds/video, comments, related posts, and admin edit link visibility.
- `/login` and `/login/mfa`: check captcha, Google login toggle, email login, MFA enrollment, MFA verification, and return URL.
- `/profile` and `/profile/settings`: check avatar upload, saves, submitted recipes, and sign-out.
- `/admin/*`: check table empty states, save errors, OAuth connection states, social failures, role changes, and mobile overflow.
