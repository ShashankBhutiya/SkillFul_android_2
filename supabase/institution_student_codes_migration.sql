-- Individual student access codes for the TPO dashboard.
-- Apply this after the app's base schema. Codes are opaque and are never
-- readable from the client: only their SHA-256 digest is stored.

create extension if not exists pgcrypto;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique, -- legacy shared code; retained only for backwards compatibility
  city text,
  created_at timestamptz not null default now()
);

-- Older TPO deployments required one shared code per institution. One-time
-- student codes replace it, so upgrades must allow new institutions without it.
alter table public.institutions alter column code drop not null;

create table if not exists public.institution_members (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('tpo', 'student')),
  roll_number text,
  branch text,
  batch_year integer,
  degree text,
  academic_year text,
  created_at timestamptz not null default now(),
  primary key (institution_id, user_id)
);

alter table public.institution_members add column if not exists degree text;
alter table public.institution_members add column if not exists academic_year text;

-- A user can be a placement officer for more than one institution, but can
-- only have one student membership at a time.
create unique index if not exists institution_members_one_student_membership
  on public.institution_members (user_id) where role = 'student';

create index if not exists institution_members_institution_role_idx
  on public.institution_members (institution_id, role);

create table if not exists public.student_access_codes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  code_hash text not null unique,
  issued_at timestamptz not null default now(),
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists student_access_codes_institution_idx
  on public.student_access_codes (institution_id);

-- Prevent app clients from calling the former shared-code enrollment RPC.
do $$
begin
  if to_regprocedure('public.join_institution(text)') is not null then
    execute 'revoke execute on function public.join_institution(text) from anon, authenticated';
  end if;
  if to_regprocedure('public.join_institution(text,text,text,integer)') is not null then
    execute 'revoke execute on function public.join_institution(text,text,text,integer) from anon, authenticated';
  end if;
end $$;

-- Existing roster memberships are preserved. Shared-code enrolment is disabled
-- above, and a TPO can reset individual students onto one-time codes as needed.

alter table public.institutions enable row level security;
alter table public.institution_members enable row level security;
alter table public.student_access_codes enable row level security;

-- SECURITY DEFINER helpers keep membership lookups out of policies on the same
-- table. Querying institution_members inline from its own RLS policy causes
-- PostgreSQL's "infinite recursion detected in policy" error.
create or replace function public.is_tpo_for_institution(p_institution_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.institution_members m
    where m.institution_id = p_institution_id
      and m.user_id::text = auth.uid()::text
      and m.role = 'tpo'
  );
$$;

create or replace function public.is_tpo_for_student(p_student_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.institution_members student
    join public.institution_members officer
      on officer.institution_id = student.institution_id
     and officer.role = 'tpo'
     and officer.user_id::text = auth.uid()::text
    where student.user_id::text = p_student_user_id::text
      and student.role = 'student'
  );
$$;

revoke all on function public.is_tpo_for_institution(uuid) from public;
revoke all on function public.is_tpo_for_student(uuid) from public;
grant execute on function public.is_tpo_for_institution(uuid) to authenticated;
grant execute on function public.is_tpo_for_student(uuid) to authenticated;

drop policy if exists "Members can read their institution" on public.institutions;
drop policy if exists "TPOs can read their institution" on public.institutions;
create policy "TPOs can read their institution"
  on public.institutions for select to authenticated
  using (public.is_tpo_for_institution(id));

drop policy if exists "Students can read their institution membership" on public.institution_members;
create policy "Students can read their institution membership"
  on public.institution_members for select to authenticated
  using (auth.uid()::text = user_id::text);

drop policy if exists "TPO reads own cohort" on public.institution_members;
drop policy if exists "TPOs can read their institution roster" on public.institution_members;
create policy "TPOs can read their institution roster"
  on public.institution_members for select to authenticated
  using (public.is_tpo_for_institution(institution_id));

grant select on public.institutions to authenticated;
grant select on public.institution_members to authenticated;

-- Remove legacy direct-write paths. Enrolment and reset now happen only
-- through the validated SECURITY DEFINER functions below.
drop policy if exists "Students can enrol themselves" on public.institution_members;
drop policy if exists "Members can leave" on public.institution_members;
revoke insert, update, delete on public.institution_members from anon, authenticated;

create or replace function public.list_available_institutions()
returns table (id uuid, name text, city text)
language sql
security definer
set search_path = public
as $$
  select i.id, i.name, i.city
  from public.institutions i
  order by i.name;
$$;

grant execute on function public.list_available_institutions() to anon, authenticated;

create or replace function public.generate_student_access_codes(
  p_institution_id uuid,
  p_count integer
)
returns table (code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_code text;
  generated integer := 0;
begin
  if auth.uid() is null or not public.is_tpo_for_institution(p_institution_id) then
    raise exception 'Not authorised to issue student codes.';
  end if;

  if p_count is null or p_count < 1 or p_count > 10000 then
    raise exception 'Choose between 1 and 10,000 codes.';
  end if;

  while generated < p_count loop
    -- 80 random bits, rendered as 20 easy-to-copy hexadecimal characters.
    next_code := upper(encode(gen_random_bytes(10), 'hex'));
    begin
      insert into public.student_access_codes (institution_id, code_hash)
      values (p_institution_id, encode(digest(next_code, 'sha256'), 'hex'));
      code := next_code;
      return next;
      generated := generated + 1;
    exception when unique_violation then
      -- An astronomically unlikely collision: draw another random code.
    end;
  end loop;
end;
$$;

grant execute on function public.generate_student_access_codes(uuid, integer) to authenticated;

create or replace function public.claim_student_access_code(
  p_institution_id uuid,
  p_code text,
  p_degree text default null,
  p_academic_year text default null
)
returns table (institution_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  access_code public.student_access_codes%rowtype;
  current_membership public.institution_members%rowtype;
  clean_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if auth.uid() is null then
    raise exception 'Sign in before entering your student code.';
  end if;

  select * into access_code
  from public.student_access_codes
  where code_hash = encode(digest(clean_code, 'sha256'), 'hex')
    and institution_id = p_institution_id
    and used_at is null
    and revoked_at is null
  for update;

  if not found then
    -- Deliberately do not reveal whether the code exists at another college.
    raise exception 'This code is invalid for the selected college.';
  end if;

  select * into current_membership
  from public.institution_members
  where user_id::text = auth.uid()::text and role = 'student'
  for update;

  if found and current_membership.institution_id <> p_institution_id then
    raise exception 'Your account is already linked to another college. Ask that TPO to reset your access.';
  end if;

  insert into public.institution_members (
    institution_id, user_id, role, degree, academic_year
  ) values (
    p_institution_id, auth.uid(), 'student', nullif(trim(p_degree), ''), nullif(trim(p_academic_year), '')
  )
  on conflict (institution_id, user_id) do update set
    degree = excluded.degree,
    academic_year = excluded.academic_year;

  update public.student_access_codes
  set used_by = auth.uid(), used_at = now()
  where id = access_code.id;

  return query select name from public.institutions where id = p_institution_id;
end;
$$;

grant execute on function public.claim_student_access_code(uuid, text, text, text) to authenticated;

create or replace function public.reset_student_access_code(
  p_institution_id uuid,
  p_student_user_id uuid
)
returns table (code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_code text;
begin
  if auth.uid() is null or not public.is_tpo_for_institution(p_institution_id) then
    raise exception 'Not authorised to reset student access.';
  end if;

  delete from public.institution_members
  where institution_id = p_institution_id and user_id::text = p_student_user_id::text and role = 'student';

  update public.student_access_codes
  set revoked_at = now()
  where institution_id = p_institution_id and used_by = p_student_user_id and revoked_at is null;

  loop
    next_code := upper(encode(gen_random_bytes(10), 'hex'));
    begin
      insert into public.student_access_codes (institution_id, code_hash)
      values (p_institution_id, encode(digest(next_code, 'sha256'), 'hex'));
      code := next_code;
      return next;
      return;
    exception when unique_violation then
    end;
  end loop;
end;
$$;

grant execute on function public.reset_student_access_code(uuid, uuid) to authenticated;
