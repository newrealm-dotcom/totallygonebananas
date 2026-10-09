-- Footer newsletter signups. Public can insert; editors read/delete in admin.

create table public.newsletter_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  email_norm  text generated always as (lower(trim(email))) stored,
  source      text not null default 'footer'
                check (char_length(source) between 1 and 40),
  created_at  timestamptz not null default now(),
  constraint newsletter_signups_email_len
    check (char_length(trim(email)) between 3 and 120),
  constraint newsletter_signups_email_unique unique (email_norm)
);

comment on table public.newsletter_signups is
  'Newsletter email signups from the site footer (and future sources).';

create index newsletter_signups_created_at_idx
  on public.newsletter_signups (created_at desc);

alter table public.newsletter_signups enable row level security;

create policy "Editors can read newsletter signups"
  on public.newsletter_signups for select
  to authenticated
  using (public.is_editor());

create policy "Anyone can submit a newsletter signup"
  on public.newsletter_signups for insert
  to anon, authenticated
  with check (true);

create policy "Editors can delete newsletter signups"
  on public.newsletter_signups for delete
  to authenticated
  using (public.is_editor());

grant select on public.newsletter_signups to authenticated;
grant insert on public.newsletter_signups to anon, authenticated;
grant delete on public.newsletter_signups to authenticated;
