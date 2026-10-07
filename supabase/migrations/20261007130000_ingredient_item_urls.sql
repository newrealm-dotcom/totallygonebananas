-- Ingredient lines may be { text, url } objects as well as plain strings.
-- Search keeps indexing the ingredient text and ignores the optional link.

create or replace function public.ingredient_groups_to_string(groups jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    (
      select string_agg(
        trim(
          both ' '
          from coalesce(g->>'title', '') || ' ' || coalesce(
            (
              select string_agg(
                case jsonb_typeof(item)
                  when 'string' then item #>> '{}'
                  when 'object' then coalesce(item->>'text', '')
                  else ''
                end,
                ' '
              )
              from jsonb_array_elements(coalesce(g->'items', '[]'::jsonb)) as item
            ),
            ''
          )
        ),
        ' '
      )
      from jsonb_array_elements(coalesce(groups, '[]'::jsonb)) as g
    ),
    ''
  );
$$;

comment on column public.recipes.ingredients is
  'Array of { title: string, items: (string | { text: string, url: string })[] }. Title may be empty. url is an optional http(s) link.';
