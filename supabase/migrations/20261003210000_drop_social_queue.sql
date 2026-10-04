-- Remove the manual social posting queue.
drop table if exists public.social_queue;
drop function if exists public.social_queue_before_write();
