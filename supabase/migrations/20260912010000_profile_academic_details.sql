ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS degree TEXT,
  ADD COLUMN IF NOT EXISTS academic_year TEXT;

UPDATE public.profiles AS profile
SET degree = COALESCE(NULLIF(BTRIM(profile.degree), ''), NULLIF(BTRIM(member.degree), '')),
    academic_year = COALESCE(NULLIF(BTRIM(profile.academic_year), ''), NULLIF(BTRIM(member.academic_year), ''))
FROM public.institution_members AS member
WHERE member.user_id::text = profile.id::text
  AND member.role = 'student'
  AND (NULLIF(BTRIM(member.degree), '') IS NOT NULL OR NULLIF(BTRIM(member.academic_year), '') IS NOT NULL);

GRANT INSERT ON public.ai_practice_attempts TO authenticated;
