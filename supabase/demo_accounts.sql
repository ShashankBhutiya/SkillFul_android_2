-- Demo account setup.
--
-- Deliberately NOT a migration: this seeds operational data, not schema, and
-- the emails differ per environment. Safe to re-run — every step is idempotent.
--
-- ─────────────────────────── PREREQUISITE ───────────────────────────
--
-- Create the two auth users first. Supabase dashboard →
--   Authentication → Users → Add user
--   • tick "Auto Confirm User" so no email round-trip is needed
--   • set a password you will actually use to sign in
--
-- Then put those two emails below and run this whole file in the SQL editor.
--
-- Passwords are never stored here and are not needed by this script.

do $$
declare
  -- ── edit these ──────────────────────────────────────────────
  v_tpo_email     text := 'tpo.demo@example.com';
  v_premium_email text := 'premium.demo@example.com';

  v_college_name  text := 'Demo Institute of Technology';
  v_college_code  text := 'DEMO2026';
  v_college_city  text := 'Pune';
  -- ────────────────────────────────────────────────────────────

  v_tpo_uid        uuid;
  v_premium_uid    uuid;
  v_institution_id uuid;
  -- timestamptz, matching the column. The client writes an ISO *string* here
  -- via toISOString(), which PostgREST parses on the way in — but inside
  -- plpgsql a text value will not implicitly cast into a timestamptz column.
  v_period_end     timestamptz;
  v_referral_code  text;
begin
  -- ══════════════════ 1. TPO portal demo ══════════════════

  select id into v_tpo_uid from auth.users where email = v_tpo_email;

  if v_tpo_uid is null then
    raise exception
      'No auth user for %. Create it under Authentication -> Users first.',
      v_tpo_email;
  end if;

  -- The join code students will enter. on conflict do update (rather than do
  -- nothing) so the RETURNING clause still yields the id on a re-run.
  insert into public.institutions (name, code, city)
  values (v_college_name, v_college_code, v_college_city)
  on conflict (code) do update
    set name = excluded.name,
        city = excluded.city
  returning id into v_institution_id;

  insert into public.institution_members (institution_id, user_id, role)
  values (v_institution_id, v_tpo_uid::text, 'tpo')
  on conflict (institution_id, user_id) do update set role = 'tpo';

  raise notice 'TPO demo ready — % is now TPO of "%"', v_tpo_email, v_college_name;
  raise notice '  join code:   %', v_college_code;
  raise notice '  invite link: https://skillfulglobal.com/skills?join=%', v_college_code;

  -- ══════════════════ 2. Premium demo ══════════════════
  --
  -- The app treats subscription_status = 'active' as premium; nothing else is
  -- consulted. subscription_id is marked so this grant is never mistaken for a
  -- real Razorpay subscription during reconciliation.

  select id into v_premium_uid from auth.users where email = v_premium_email;

  if v_premium_uid is null then
    raise exception
      'No auth user for %. Create it under Authentication -> Users first.',
      v_premium_email;
  end if;

  v_period_end := now() + interval '1 year';

  -- The app only ever SELECTs and UPDATEs profiles — it never inserts one.
  -- Rows come from a trigger on auth.users, which does not fire for users
  -- added through the dashboard, so create it here if it is missing.
  --
  -- referral_code is the one column that is NOT NULL with no default —
  -- generating it is precisely what that trigger exists to do. The 6-char
  -- uid prefix matches the fallback the client computes in AuthContext, so a
  -- profile fetch failure degrades to the same code that is actually stored.
  if not exists (select 1 from public.profiles where id = v_premium_uid) then
    v_referral_code := upper(substr(replace(v_premium_uid::text, '-', ''), 1, 6));

    -- Vanishingly unlikely, but the column is unique and a clash would abort.
    while exists (select 1 from public.profiles where referral_code = v_referral_code) loop
      v_referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end loop;

    insert into public.profiles (id, referral_code)
    values (v_premium_uid, v_referral_code);

    raise notice 'Created the missing profiles row for % (referral code %)',
      v_premium_email, v_referral_code;
  end if;

  update public.profiles
     set subscription_status     = 'active',
         subscription_id         = 'demo_manual_grant',
         subscription_period_end = v_period_end
   where id = v_premium_uid;

  if not found then
    raise exception
      'Could not create or update a profiles row for %.',
      v_premium_email;
  end if;

  raise notice 'Premium demo ready — % is active until %', v_premium_email, v_period_end;
end $$;


-- ────────────────────── diagnostic: missing profiles ──────────────────────
-- The premium demo needed a profiles row created by hand, which means the
-- trigger on auth.users did not fire for it. Run this to see whether that is
-- a one-off or systemic: any user without a profiles row has no referral code,
-- no premium state and no saved user_mode.

select count(*)                                as auth_users,
       count(*) filter (where p.id is null)    as missing_profile
from auth.users u
left join public.profiles p on p.id = u.id;


-- ─────────────────────────── verify ───────────────────────────
-- Run separately to confirm both landed.

select
  u.email,
  case when m.role = 'tpo' then i.name end          as tpo_of,
  case when m.role = 'tpo' then i.code end          as join_code,
  p.subscription_status,
  p.subscription_period_end
from auth.users u
left join public.institution_members m on m.user_id = u.id::text
left join public.institutions        i on i.id      = m.institution_id
left join public.profiles            p on p.id      = u.id
where u.email in ('tpo.demo@example.com', 'premium.demo@example.com');


-- ─────────────────────────── teardown ───────────────────────────
-- Revokes both demos. Deleting the auth users themselves is a dashboard action.
--
-- delete from public.institution_members
--  where user_id = (select id::text from auth.users where email = 'tpo.demo@example.com');
--
-- delete from public.institutions where code = 'DEMO2026';
--
-- update public.profiles
--    set subscription_status = 'inactive',
--        subscription_id = null,
--        subscription_period_end = null
--  where id = (select id from auth.users where email = 'premium.demo@example.com');
