-- Let students see their linked college details and reset their own college link.

CREATE OR REPLACE FUNCTION public.get_my_linked_college()
RETURNS TABLE (
  institution_id UUID,
  institution_name TEXT,
  city TEXT,
  roll_number TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.name, i.city, m.roll_number
  FROM public.institution_members AS m
  JOIN public.institutions AS i ON i.id = m.institution_id
  WHERE auth.uid() IS NOT NULL
    AND m.user_id::text = auth.uid()::text
    AND m.role = 'student'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_linked_college() TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_student_college()
RETURNS TABLE (institution_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_membership public.institution_members%ROWTYPE;
  current_institution_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in before resetting your college link.';
  END IF;

  SELECT * INTO current_membership
  FROM public.institution_members
  WHERE user_id::text = auth.uid()::text
    AND role = 'student'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your account is not linked to a college.';
  END IF;

  SELECT name INTO current_institution_name
  FROM public.institutions
  WHERE id = current_membership.institution_id;

  DELETE FROM public.institution_members
  WHERE institution_id = current_membership.institution_id
    AND user_id::text = auth.uid()::text
    AND role = 'student';

  UPDATE public.student_access_codes
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE institution_id = current_membership.institution_id
    AND used_by::text = auth.uid()::text
    AND revoked_at IS NULL;

  RETURN QUERY SELECT COALESCE(current_institution_name, 'your college');
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_student_college() TO authenticated;
