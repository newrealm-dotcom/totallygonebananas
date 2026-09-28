-- Steps become titled groups (jsonb), matching ingredient lists.
-- Legacy flat [{ text, media }] rows migrate into a single untitled group.

update public.recipes
set steps = case
  when steps is null or steps = '[]'::jsonb
    then '[{"title":"","steps":[]}]'::jsonb
  when jsonb_typeof(steps->0) = 'object' and (steps->0) ? 'steps'
    then steps
  else jsonb_build_array(jsonb_build_object('title', '', 'steps', steps))
end;

alter table public.recipes
  drop constraint if exists recipes_steps_check;

alter table public.recipes
  add constraint recipes_steps_is_array
  check (jsonb_typeof(steps) = 'array');

alter table public.recipes
  add constraint recipes_steps_group_count
  check (jsonb_array_length(steps) >= 1 and jsonb_array_length(steps) <= 12);

comment on column public.recipes.steps is
  'Array of { title: string, steps: [{ text, media? }] }. Title may be empty for the main list.';
