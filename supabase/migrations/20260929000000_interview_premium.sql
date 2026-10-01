-- Separate the college ₹50 Premium plan from the ₹250 Interview Premium plan.
alter table public.profiles
  add column if not exists subscription_tier text not null default 'basic'
  check (subscription_tier in ('basic', 'interview'));

-- Existing non-college paid subscribers use plans that already cost more than
-- Interview Premium, so preserve the entitlement promised to them.
update public.profiles p
set subscription_tier = 'interview'
where p.subscription_status = 'active'
  and not exists (
    select 1
    from public.institution_members member
    where member.user_id::text = p.id::text
      and member.role = 'student'
  );

create table if not exists public.interview_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  job_description text not null,
  degree text not null,
  academic_year text not null,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interview_practice_sessions_user_updated_idx
  on public.interview_practice_sessions(user_id, updated_at desc);

alter table public.interview_practice_sessions enable row level security;

drop policy if exists "Users can read their interview sessions" on public.interview_practice_sessions;
create policy "Users can read their interview sessions"
  on public.interview_practice_sessions for select
  using (auth.uid() = user_id);

-- Writes happen through the generate-interview Edge Function after it checks
-- the paid entitlement. Clients cannot create or alter session content.
