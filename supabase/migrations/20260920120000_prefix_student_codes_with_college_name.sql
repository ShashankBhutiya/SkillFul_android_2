-- Prefix generated student access codes with the college name.
--
-- For example, for an institution named "ABC College", codes are generated
-- like "ABC-COLLEGE-4F1A8C2E9B3D".
--
-- Hashes are computed on the clean alphanumeric code (with hyphens stripped)
-- so that students can enter the code either with hyphens (ABC-COLLEGE-4F1A...)
-- or without hyphens (ABCCOLLEGE4F1A...), case-insensitively, which matches
-- the claim function:
--   clean_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));

create or replace function public.generate_student_access_codes(
  p_institution_id uuid,
  p_count integer
)
returns table (code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  inst_name text;
  prefix text;
  next_code text;
  clean_code text;
  generated integer := 0;
begin
  if auth.uid() is null or not public.is_tpo_for_institution(p_institution_id) then
    raise exception 'Not authorised to issue student codes.';
  end if;

  if p_count is null or p_count < 1 or p_count > 10000 then
    raise exception 'Choose between 1 and 10,000 codes.';
  end if;

  select name into inst_name from public.institutions where id = p_institution_id;
  prefix := regexp_replace(upper(regexp_replace(trim(coalesce(inst_name, '')), '[^A-Za-z0-9]+', '-', 'g')), '^-+|-+$', '', 'g');
  if prefix is null or prefix = '' then
    prefix := 'COLLEGE';
  end if;
  if length(prefix) > 24 then
    prefix := substring(prefix from 1 for 24);
    prefix := regexp_replace(prefix, '-+$', '');
  end if;

  while generated < p_count loop
    -- Prefix + 12 random hex characters (48 bits of entropy)
    next_code := prefix || '-' || upper(encode(gen_random_bytes(6), 'hex'));
    clean_code := upper(regexp_replace(next_code, '[^A-Za-z0-9]', '', 'g'));
    begin
      insert into public.student_access_codes (institution_id, code_hash)
      values (p_institution_id, encode(digest(clean_code, 'sha256'), 'hex'));
      code := next_code;
      return next;
      generated := generated + 1;
    exception when unique_violation then
      -- Collision: retry next iteration
    end;
  end loop;
end;
$$;

grant execute on function public.generate_student_access_codes(uuid, integer) to authenticated;

create or replace function public.reset_student_access_code(
  p_institution_id uuid,
  p_student_user_id uuid
)
returns table (code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  inst_name text;
  prefix text;
  next_code text;
  clean_code text;
begin
  if auth.uid() is null or not public.is_tpo_for_institution(p_institution_id) then
    raise exception 'Not authorised to reset student access.';
  end if;

  delete from public.institution_members
  where institution_id = p_institution_id and user_id::text = p_student_user_id::text and role = 'student';

  update public.student_access_codes
  set revoked_at = now()
  where institution_id = p_institution_id and used_by = p_student_user_id and revoked_at is null;

  select name into inst_name from public.institutions where id = p_institution_id;
  prefix := regexp_replace(upper(regexp_replace(trim(coalesce(inst_name, '')), '[^A-Za-z0-9]+', '-', 'g')), '^-+|-+$', '', 'g');
  if prefix is null or prefix = '' then
    prefix := 'COLLEGE';
  end if;
  if length(prefix) > 24 then
    prefix := substring(prefix from 1 for 24);
    prefix := regexp_replace(prefix, '-+$', '');
  end if;

  loop
    next_code := prefix || '-' || upper(encode(gen_random_bytes(6), 'hex'));
    clean_code := upper(regexp_replace(next_code, '[^A-Za-z0-9]', '', 'g'));
    begin
      insert into public.student_access_codes (institution_id, code_hash)
      values (p_institution_id, encode(digest(clean_code, 'sha256'), 'hex'));
      code := next_code;
      return next;
      return;
    exception when unique_violation then
    end;
  end loop;
end;
$$;

grant execute on function public.reset_student_access_code(uuid, uuid) to authenticated;
