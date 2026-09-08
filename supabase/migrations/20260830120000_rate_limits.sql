-- Server-side rate limiting for the edge functions.
--
-- Until now nothing throttled them. The only limiter in the codebase was a
-- cooldown inside AuthModal.tsx, which lives in the browser and is therefore
-- advisory: curl ignores it. razorpay-checkout would create unlimited Razorpay
-- orders, and send-notification would fan out unlimited pushes.
--
-- Why Postgres and not an in-memory counter: edge functions run as short-lived
-- Deno isolates that are created, frozen and discarded per region and per load
-- spike. A module-level Map is per-isolate, so a caller spreading requests
-- across isolates sees a fresh quota every time. The limit has to live in the
-- one component all isolates share.
--
-- Fixed window rather than sliding: a sliding log needs a row per request and a
-- periodic sweep to stay bounded. A fixed window needs one row per caller and
-- costs a single upsert. The tradeoff is the classic boundary burst — a caller
-- can spend a full quota at the end of one window and again at the start of the
-- next, so treat the effective ceiling as 2x over a window straddle. For abuse
-- control at this scale that is comfortably good enough.

create table if not exists public.rate_limits (
  bucket       text        primary key,
  window_start timestamptz not null default now(),
  hits         integer     not null default 0
);

-- Supports the prune below; without it the sweep degrades to a seq scan once
-- the table has any real traffic in it.
create index if not exists rate_limits_window_start_idx
  on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;

-- Deliberately no policies. Nothing outside a service-role connection has any
-- business reading or writing this table: it is edge-function bookkeeping, and
-- a client that could read it would learn exactly how much quota it has left
-- before being throttled, while a client that could write it could simply
-- reset its own counter.
grant all on public.rate_limits to service_role;

-- Count one hit against a bucket and report whether it is allowed.
--
-- SECURITY DEFINER so the caller needs no privilege on rate_limits itself, and
-- EXECUTE is granted to service_role alone (see the revoke below) — an
-- anon-key client cannot reach this to burn someone else's quota or to probe
-- how close a bucket is to its ceiling.
--
-- The whole read-modify-write is one INSERT .. ON CONFLICT statement on
-- purpose. Doing it as SELECT-then-UPDATE would let two concurrent requests
-- both read the same count and both decide they were under the limit; the
-- upsert takes a row lock, so concurrent callers serialise and each sees the
-- other's increment.
create or replace function public.check_rate_limit(
  p_bucket         text,
  p_limit          integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now          timestamptz := now();
  v_window       interval    := make_interval(secs => p_window_seconds);
  v_hits         integer;
  v_window_start timestamptz;
begin
  if p_bucket is null or p_limit is null or p_limit < 1 then
    raise exception 'check_rate_limit: bucket required and limit must be >= 1';
  end if;

  insert into public.rate_limits as rl (bucket, window_start, hits)
  values (p_bucket, v_now, 1)
  on conflict (bucket) do update
    -- An expired window is reset rather than deleted-and-reinserted so the row
    -- stays put and the upsert remains a single statement.
    set hits = case
                 when rl.window_start + v_window <= v_now then 1
                 else rl.hits + 1
               end,
        window_start = case
                 when rl.window_start + v_window <= v_now then v_now
                 else rl.window_start
               end
  returning rl.hits, rl.window_start into v_hits, v_window_start;

  allowed   := v_hits <= p_limit;
  remaining := greatest(p_limit - v_hits, 0);

  -- Seconds until the current window rolls over, for the Retry-After header.
  retry_after := case
                   when allowed then 0
                   else greatest(
                     ceil(extract(epoch from (v_window_start + v_window - v_now)))::integer,
                     1
                   )
                 end;

  return next;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from public;
grant  execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Rows are only interesting until their window expires, but nothing deletes
-- them on the read path — a bucket that is never hit again would otherwise sit
-- there forever. The widest window any caller uses is measured in minutes, so
-- anything untouched for a day is certainly dead.
create or replace function public.prune_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits
  where window_start < now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.prune_rate_limits() from public;
grant  execute on function public.prune_rate_limits() to service_role;

-- Schedule the sweep if pg_cron is installed. It is available on hosted
-- Supabase but not in every local stack, so a missing extension must not fail
-- the migration — the table simply grows slowly until someone calls
-- prune_rate_limits() by hand.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('prune-rate-limits')
      where exists (select 1 from cron.job where jobname = 'prune-rate-limits');
    perform cron.schedule('prune-rate-limits', '17 4 * * *', 'select public.prune_rate_limits()');
  else
    raise notice 'pg_cron not installed; run select public.prune_rate_limits() periodically instead';
  end if;
end;
$$;
