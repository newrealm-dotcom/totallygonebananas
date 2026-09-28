-- Rich-text notes + estimated nutrition facts on recipes.
-- Existing short time_note values are copied into notes as a paragraph when notes is empty.

alter table public.recipes
  add column if not exists notes text,
  add column if not exists nutrition jsonb;

update public.recipes
set notes = '<p>' || replace(replace(replace(time_note, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>'
where time_note is not null
  and btrim(time_note) <> ''
  and (notes is null or btrim(notes) = '');

comment on column public.recipes.notes is
  'Optional rich-text recipe notes (HTML from the WYSIWYG editor).';

comment on column public.recipes.nutrition is
  'Estimated nutrition facts: { perServing, total, servings, unmatched, matchedCount, calculatedAt }.';
