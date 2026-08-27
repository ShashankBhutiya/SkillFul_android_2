-- Missing profiles rows — diagnosis and backfill.
--
-- Found 2026-08-26: 17 of 37 auth users had no public.profiles row.
--
-- WHY IT MATTERS. The app only ever SELECTs and UPDATEs profiles; it never
-- inserts one. Rows are supposed to come from a trigger on auth.users. For a
-- user missing that row:
--
--   * Referrals silently do nothing — referral_code lives on profiles.
--   * user_mode never persists, so Student/Professional resets every session.
--   * PAYMENTS DO NOT GRANT PREMIUM. razorpayService does
--       .from("profiles").update({subscription_status:'active'}).eq("id", uid)
--     and an UPDATE matching zero rows is not an error in Postgres, so `error`
--     is null, the `if (error) throw` never fires, and the function returns
--     { success: true }. The user pays and receives nothing.
--
-- Run section 1 to work out the cause, then section 2 to repair the data.
-- Section 2 is additive and idempotent: it only inserts rows that are absent
-- and never modifies an existing one.


-- ══════════════════ 1. Diagnosis ══════════════════

-- 1a. Does the trigger still exist, and is it enabled?
--     tgenabled: 'O' = enabled, 'D' = disabled.
select t.tgname,
       t.tgenabled,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class     c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'auth'
  and c.relname = 'users'
  and not t.tgisinternal;


-- 1b. Is it time-bounded? A clean cutoff means the trigger was added or
--     dropped on that date; an even spread means it fails intermittently.
select date_trunc('day', u.created_at)::date  as signup_day,
       count(*)                               as users,
       count(*) filter (where p.id is null)   as missing
from auth.users u
left join public.profiles p on p.id = u.id
group by 1
order by 1;


-- 1c. Is it specific to a sign-up method? Google OAuth and admin-created
--     users take different paths through GoTrue than email sign-ups.
select coalesce(u.raw_app_meta_data ->> 'provider', 'unknown') as provider,
       count(*)                                                as users,
       count(*) filter (where p.id is null)                    as missing
from auth.users u
left join public.profiles p on p.id = u.id
group by 1
order by missing desc;


-- 1d. Did any affected user already try to pay? These are the ones to contact.
--     (Empty result is the good outcome.)
select u.id, u.email, u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
  and exists (
    select 1 from public.user_progress g where g.user_id = u.id::text
  )
order by u.created_at;


-- ══════════════════ 2. Backfill ══════════════════
--
-- Creates the missing rows. referral_code is the only NOT NULL column without
-- a default — generating it is exactly what the trigger was meant to do. The
-- 6-char uid prefix matches the fallback AuthContext computes client-side, so
-- a failed profile fetch degrades to the same code that is actually stored.

do $$
declare
  r            record;
  v_code       text;
  v_created    integer := 0;
begin
  for r in
    select u.id
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    v_code := upper(substr(replace(r.id::text, '-', ''), 1, 6));

    -- referral_code is unique; fall back to random on the rare clash.
    while exists (select 1 from public.profiles where referral_code = v_code) loop
      v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end loop;

    insert into public.profiles (id, referral_code)
    values (r.id, v_code)
    on conflict (id) do nothing;

    v_created := v_created + 1;
  end loop;

  raise notice 'Backfilled % profiles row(s).', v_created;
end $$;


-- ══════════════════ 3. Confirm ══════════════════
-- missing_profile should now be 0.

select count(*)                             as auth_users,
       count(*) filter (where p.id is null) as missing_profile
from auth.users u
left join public.profiles p on p.id = u.id;
