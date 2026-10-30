-- Fixed-window counters for app rate limits. Identifiers are hashed in the app;
-- this table never stores a raw IP address or user id.
-- Only the service role can read or write the table, and only it can call the function.

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  hit_count integer not null check (hit_count >= 0 and hit_count <= 1000000),
  window_started_at timestamptz not null
);

create index if not exists rate_limit_buckets_window_started_at_idx
  on public.rate_limit_buckets (window_started_at);

alter table public.rate_limit_buckets enable row level security;

revoke all on table public.rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;

drop policy if exists "Service role manages rate limit buckets" on public.rate_limit_buckets;

create policy "Service role manages rate limit buckets"
  on public.rate_limit_buckets
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.consume_rate_limit(
  p_keys text[],
  p_limits integer[],
  p_window_seconds integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_window bigint;
  v_started timestamptz;
  v_retry integer;
  v_key text;
  v_limit integer;
  v_count integer;
  v_allowed boolean := true;
  v_remaining integer := 2147483647;
begin
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit window';
  end if;
  if p_keys is null or p_limits is null
     or cardinality(p_keys) < 1
     or cardinality(p_keys) > 4
     or cardinality(p_keys) <> cardinality(p_limits) then
    raise exception 'invalid rate limit keys';
  end if;

  v_window := floor(extract(epoch from clock_timestamp()) / p_window_seconds)::bigint;
  v_started := to_timestamp(v_window * p_window_seconds);
  v_retry := greatest(
    1,
    ceil(extract(epoch from (v_started + make_interval(secs => p_window_seconds) - clock_timestamp())))::integer
  );

  -- Sort by key so concurrent calls lock rows in the same order.
  for v_key, v_limit in
    select pair.k, pair.l
    from unnest(p_keys, p_limits) as pair(k, l)
    order by pair.k
  loop
    if v_key is null or v_key !~ '^[a-z0-9:_-]{16,180}$' then
      raise exception 'invalid rate limit key';
    end if;
    if v_limit is null or v_limit < 1 or v_limit > 10000 then
      raise exception 'invalid rate limit';
    end if;

    insert into public.rate_limit_buckets as bucket (bucket_key, hit_count, window_started_at)
    values (v_key || ':' || v_window::text, 1, v_started)
    on conflict (bucket_key) do update
      set hit_count = least(bucket.hit_count + 1, 1000000)
    returning hit_count into v_count;

    if v_count > v_limit then
      v_allowed := false;
    end if;
    v_remaining := least(v_remaining, greatest(v_limit - v_count, 0));
  end loop;

  if random() < 0.01 then
    delete from public.rate_limit_buckets
    where bucket_key in (
      select stale.bucket_key
      from public.rate_limit_buckets as stale
      where stale.window_started_at < now() - interval '2 hours'
      order by stale.window_started_at
      limit 50
      for update skip locked
    );
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'retry_after', case when v_allowed then 0 else v_retry end
  );
end;
$$;

revoke all on function public.consume_rate_limit(text[], integer[], integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text[], integer[], integer) to service_role;

notify pgrst, 'reload schema';
