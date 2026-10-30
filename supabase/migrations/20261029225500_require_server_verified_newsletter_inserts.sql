-- Newsletter signups now pass through the server action after Turnstile verification.

drop policy if exists "Anyone can submit a newsletter signup" on public.newsletter_signups;
revoke insert on public.newsletter_signups from anon, authenticated;
