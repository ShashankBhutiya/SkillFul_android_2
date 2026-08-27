-- TPO (Training & Placement Officer) dashboard.
--
-- The app already records everything a placement cell wants to see —
-- user_progress, leaderboard_scores, user_streaks — but nothing ties a student
-- to a college. These two tables are that missing link, and are the only
-- schema the TPO dashboard needs.

-- ─────────────────────────── institutions ───────────────────────────

create table if not exists public.institutions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- Students type this at signup to join their college's cohort.
  code        text not null unique,
  city        text,
  created_at  timestamptz not null default now()
);

comment on table public.institutions is
  'Colleges using the TPO dashboard. code is the join code students enter.';

-- ──────────────────────── institution_members ───────────────────────

create table if not exists public.institution_members (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions (id) on delete cascade,
  -- Matches the id used across user_progress / user_streaks (auth uid as text).
  user_id         text not null,
  role            text not null default 'student' check (role in ('student', 'tpo')),
  roll_number     text,
  branch          text,
  batch_year      integer,
  joined_at       timestamptz not null default now(),
  unique (institution_id, user_id)
);

create index if not exists idx_institution_members_institution
  on public.institution_members (institution_id, role);

create index if not exists idx_institution_members_user
  on public.institution_members (user_id);

comment on table public.institution_members is
  'Who belongs to which institution, and whether they are a student or its TPO.';

-- ───────────────────────────── row level security ───────────────────────────
--
-- Stricter than the app's existing tables on purpose: this one exposes a named
-- student roster, so reads are restricted to the institution the caller
-- actually belongs to rather than being open with USING (true).

alter table public.institutions        enable row level security;
alter table public.institution_members enable row level security;

-- Both helpers are SECURITY DEFINER, and that is load-bearing rather than
-- incidental. A policy ON institution_members that queried institution_members
-- inline would recurse into itself and Postgres would abort with "infinite
-- recursion detected in policy". Running as the definer bypasses RLS on the
-- lookup and breaks the cycle.

-- Institutions the caller belongs to, in any role.
create or replace function public.my_institution_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select institution_id
  from public.institution_members
  where user_id = auth.uid()::text;
$$;

-- Institutions the caller runs placements for.
create or replace function public.my_tpo_institution_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select institution_id
  from public.institution_members
  where user_id = auth.uid()::text
    and role = 'tpo';
$$;

drop policy if exists "Members can read their institution" on public.institutions;
create policy "Members can read their institution"
  on public.institutions for select
  using (id in (select public.my_institution_ids()));

-- A TPO reads the whole roster; a student reads only their own membership row.
drop policy if exists "TPO reads own cohort" on public.institution_members;
create policy "TPO reads own cohort"
  on public.institution_members for select
  using (
    user_id = auth.uid()::text
    or institution_id in (select public.my_tpo_institution_ids())
  );

-- Students enrol themselves; only a service-role key promotes anyone to 'tpo'.
drop policy if exists "Students can enrol themselves" on public.institution_members;
create policy "Students can enrol themselves"
  on public.institution_members for insert
  with check (user_id = auth.uid()::text and role = 'student');

drop policy if exists "Members can leave" on public.institution_members;
create policy "Members can leave"
  on public.institution_members for delete
  using (user_id = auth.uid()::text);

-- ─────────────────────────────── seeding ────────────────────────────
--
-- Create an institution and its TPO with the service-role key (or the SQL
-- editor, which runs as postgres):
--
--   insert into public.institutions (name, code, city)
--   values ('Your College of Engineering', 'YCE2026', 'Pune')
--   returning id;
--
--   insert into public.institution_members (institution_id, user_id, role)
--   values ('<institution id from above>', '<TPO auth uid>', 'tpo');
--
-- Students join with the same insert and role 'student', which the RLS policy
-- above already permits them to do for themselves.
