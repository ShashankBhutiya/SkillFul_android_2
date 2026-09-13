-- Store a student's roll number when they join a college cohort.
ALTER TABLE public.institution_members
  ADD COLUMN IF NOT EXISTS roll_number TEXT;

CREATE OR REPLACE FUNCTION public.claim_student_access_code(
  p_institution_id UUID,
  p_code TEXT,
  p_roll_number TEXT,
  p_degree TEXT DEFAULT NULL,
  p_academic_year TEXT DEFAULT NULL
)
RETURNS TABLE (institution_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_code public.student_access_codes%ROWTYPE;
  current_membership public.institution_members%ROWTYPE;
  clean_code TEXT := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  clean_roll_number TEXT := nullif(trim(p_roll_number), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in before entering your student code.';
  END IF;

  IF clean_roll_number IS NULL THEN
    RAISE EXCEPTION 'Enter your roll number before linking your college.';
  END IF;

  SELECT * INTO access_code
  FROM public.student_access_codes
  WHERE code_hash = encode(digest(clean_code, 'sha256'), 'hex')
    AND institution_id = p_institution_id
    AND used_at IS NULL
    AND revoked_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This code is invalid for the selected college.';
  END IF;

  SELECT * INTO current_membership
  FROM public.institution_members
  WHERE user_id::text = auth.uid()::text AND role = 'student'
  FOR UPDATE;

  IF FOUND AND current_membership.institution_id <> p_institution_id THEN
    RAISE EXCEPTION 'Your account is already linked to another college. Ask that TPO to reset your access.';
  END IF;

  INSERT INTO public.institution_members (
    institution_id, user_id, role, degree, academic_year, roll_number
  ) VALUES (
    p_institution_id, auth.uid(), 'student', nullif(trim(p_degree), ''), nullif(trim(p_academic_year), ''), clean_roll_number
  )
  ON CONFLICT (institution_id, user_id) DO UPDATE SET
    degree = EXCLUDED.degree,
    academic_year = EXCLUDED.academic_year,
    roll_number = EXCLUDED.roll_number;

  UPDATE public.student_access_codes
  SET used_by = auth.uid(), used_at = now()
  WHERE id = access_code.id;

  RETURN QUERY SELECT name FROM public.institutions WHERE id = p_institution_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_student_access_code(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
