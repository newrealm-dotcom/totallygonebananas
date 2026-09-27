-- Singleton homepage promo band (image + copy + CTA).

create table public.homepage_promo (
  id text primary key default 'default' check (id = 'default'),
  heading text not null check (char_length(heading) between 2 and 120),
  body text not null check (char_length(body) between 1 and 500),
  button_label text not null check (char_length(button_label) between 1 and 40),
  button_href text not null check (
    button_href ~ '^/'
    or button_href ~ '^https?://'
  ),
  image_path text not null default '/featured-home.webp',
  updated_at timestamptz not null default now()
);

create or replace function public.homepage_promo_before_write()
returns trigger
language plpgsql
as $$
begin
  new.id := 'default';
  new.updated_at := now();
  return new;
end;
$$;

create trigger homepage_promo_before_write
  before insert or update on public.homepage_promo
  for each row execute function public.homepage_promo_before_write();

alter table public.homepage_promo enable row level security;

create policy "Homepage promo is public"
  on public.homepage_promo for select
  to anon, authenticated
  using (true);

create policy "Editors manage homepage promo"
  on public.homepage_promo for all
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

grant select on public.homepage_promo to anon, authenticated;
grant insert, update, delete on public.homepage_promo to authenticated;

insert into public.homepage_promo (id, heading, body, button_label, button_href, image_path)
values (
  'default',
  'Got ripe bananas? We have ideas.',
  'Placeholder copy for a full-width homepage band. Swap this text for a seasonal promo, community callout, or whatever you want to spotlight next.',
  'See what''s cooking',
  '/recipes',
  '/featured-home.webp'
);
