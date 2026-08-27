-- Student enrolment by join code.
--
-- Fixes two gaps left by 20260825020012_tpo_dashboard:
--
--   1. A student could not resolve a join code. The SELECT policy on
--      institutions requires membership, so reading "which college is YCE2026"
--      was impossible for the very people who need to do it — chicken and egg.
--
--   2. The direct INSERT policy checked user_id and role but not
--      institution_id, so anyone who learned a UUID could add themselves to
--      that college's roster and appear in its TPO's dashboard.
--
-- Both are solved by routing enrolment through one SECURITY DEFINER function.
-- The client never sees or supplies an institution_id — it sends the code, the
-- server resolves it — so the direct-insert policy is dropped entirely.

-- ─────────────────────────── join_institution ───────────────────────────

create or replace function public.join_institution(
  p_code        text,
  p_roll_number text default null,
  p_branch      text default null,
  p_batch_year  integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         text;
  v_institution public.institutions%rowtype;
  v_existing    public.institution_members%rowtype;
begin
  v_uid := auth.uid()::text;

  -- Guests have no uid, so enrolment is for signed-in students only.
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_code is null or btrim(p_code) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  -- Codes are shared verbally and on posters, so match forgivingly.
  select * into v_institution
  from public.institutions
  where upper(code) = upper(btrim(p_code));

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  -- A TPO is already attached to their institution; joining as a student
  -- would clash with their staff row, so leave it alone and report success.
  select * into v_existing
  from public.institution_members
  where user_id = v_uid
    and institution_id = v_institution.id;

  if found and v_existing.role = 'tpo' then
    return jsonb_build_object(
      'ok', true,
      'institution_name', v_institution.name,
      'already_staff', true
    );
  end if;

  -- One college per student. Joining a different one moves them rather than
  -- leaving them on two rosters, which would double-count them for two TPOs.
  delete from public.institution_members
  where user_id = v_uid
    and role = 'student'
    and institution_id <> v_institution.id;

  insert into public.institution_members (
    institution_id, user_id, role, roll_number, branch, batch_year
  )
  values (
    v_institution.id,
    v_uid,
    'student',
    nullif(btrim(p_roll_number), ''),
    nullif(btrim(p_branch), ''),
    p_batch_year
  )
  on conflict (institution_id, user_id) do update
    -- Re-submitting with blanks must not wipe details already on file.
    set roll_number = coalesce(excluded.roll_number, institution_members.roll_number),
        branch      = coalesce(excluded.branch,      institution_members.branch),
        batch_year  = coalesce(excluded.batch_year,  institution_members.batch_year);

  return jsonb_build_object(
    'ok', true,
    'institution_name', v_institution.name,
    'already_staff', false
  );
end;
$$;

comment on function public.join_institution is
  'Enrol the calling user as a student of the institution with this join code. '
  'SECURITY DEFINER so the code can be resolved without granting students read '
  'access to the whole institutions table.';

revoke all on function public.join_institution(text, text, text, integer) from public, anon;
grant execute on function public.join_institution(text, text, text, integer) to authenticated;

-- ─────────────────────── my_institution: read-back ───────────────────────
-- Lets a student see which college they are attached to without exposing the
-- roster. Their own membership row is already readable; this joins the name on.

create or replace function public.my_institution()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
           'institution_name', i.name,
           'code',             i.code,
           'role',             m.role,
           'roll_number',      m.roll_number,
           'branch',           m.branch,
           'batch_year',       m.batch_year
         )
  from public.institution_members m
  join public.institutions i on i.id = m.institution_id
  where m.user_id = auth.uid()::text
  order by case when m.role = 'tpo' then 0 else 1 end
  limit 1;
$$;

revoke all on function public.my_institution() from public, anon;
grant execute on function public.my_institution() to authenticated;

-- ───────────────────────── close the direct insert ─────────────────────────
-- join_institution is SECURITY DEFINER and therefore bypasses RLS, so no
-- client-facing INSERT policy is needed. Dropping it removes the ability to
-- self-insert into an arbitrary institution_id.

drop policy if exists "Students can enrol themselves" on public.institution_members;
