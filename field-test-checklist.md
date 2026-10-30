# Field Test Checklist

Date: 2026-10-30

Run this on a real phone on cellular, weak Wi-Fi, and desktop. Use at least two accounts: member and admin. Also test signed out.

## Changed Features To Test

- Recipe save/edit/publish flow.
- Individual recipe pages.
- Admin MFA enforcement.
- Turnstile login and recipe submission.
- Blog listing first page and Load More behavior.
- Scroll engagement popup.
- Footer/social icon changes, including TikTok.
- Blog video embed behavior.
- Social auto-posting to Instagram, Pinterest, Twitter/X, and TikTok.
- Supabase explicit grants/RLS behavior.
- Microsoft Clarity configuration.
- Mobile menu and sticky header behavior.

## Phone Field Tests

### Signed-out browsing

- Open homepage on cellular.
- Scroll past 33% and confirm the popup appears once.
- Tap Join the bunch and confirm the popup disappears and login opens.
- Go back, reload, and confirm the popup does not keep nagging after dismissal.
- Turn on airplane mode and tap recipe/blog links. Confirm failure is understandable after reconnect.
- Open `/blog`; confirm 9 posts show before Load More.
- Tap Load More repeatedly; confirm no duplicates and no layout jump.
- Open a recipe detail page; confirm no 500 error.
- Close the browser tab, reopen, and verify the same recipe still loads.

### Member account

- Sign in with a normal member account.
- Confirm captcha/Turnstile does not block a valid login.
- Start a new recipe.
- Add title, description, category, ingredients, steps, notes, and image.
- Lock the phone or close the browser mid-edit; reopen and confirm draft restore works.
- Switch to bad signal and tap save/submit; confirm pending/error state is clear and no duplicate recipe appears.
- Submit for review.
- Sign out and confirm unpublished recipe is not public.

### Admin account

- Sign in as admin.
- Confirm MFA prompt appears before admin/recipe publishing actions.
- Complete MFA.
- Edit a saved recipe with apostrophes and confirm capitalization behavior is correct.
- Publish the recipe.
- Open the public recipe detail page in a private/signed-out browser and confirm it loads.
- Check the admin recipe list and review queue.

### Social auto-posting

- Publish one new recipe with a cover image.
- Publish one blog post with a cover image.
- Publish one Our Faves post with a cover image.
- In admin/social logs, confirm rows are created for Instagram, Pinterest, Twitter/X, and TikTok.
- Confirm each network either posts successfully or records a useful failure message.
- Disconnect/reconnect Pinterest and TikTok from admin pages and repeat one publish.

### Mobile navigation and layout

- Open mobile menu.
- Confirm social icons are removed from the mobile menu.
- Confirm Privacy Policy is removed from the mobile menu.
- Confirm item text is readable and tap targets feel large enough.
- Confirm Sign In button width matches Add A Recipe.
- Scroll slowly under the sticky header and confirm no menu item overlaps page text.

### Bad-network and second-account checks

- While saving a recipe, turn on airplane mode and back off.
- While publishing as admin, background the browser, reopen, and confirm final state is obvious.
- Sign out, sign into a second member account on the same phone, and confirm it cannot edit the first member's drafts or saves.
- Confirm the second account can save favorites independently.

## Release Exit Criteria

- Lint, typecheck, and build pass.
- Dependency audit has no critical or high findings.
- No 500s on public recipe pages.
- Login works for member and admin.
- Admin MFA gates admin publishing.
- Recipe save/submit/publish works on mobile.
- Social posting creates clear success/failure rows.
- No duplicate content from repeated taps or bad network retries.
