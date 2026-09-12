-- Allow a signed-in TPO to read learning data only for students who belong to
-- one of their institutions. Apply institution_student_codes_migration.sql
-- first; it defines is_tpo_for_student(uuid).

DROP POLICY IF EXISTS "TPOs can read cohort profiles" ON public.profiles;
CREATE POLICY "TPOs can read cohort profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_tpo_for_student(id));

DROP POLICY IF EXISTS "TPOs can read cohort progress" ON public.user_progress;
CREATE POLICY "TPOs can read cohort progress"
  ON public.user_progress FOR SELECT TO authenticated
  USING (CASE
    WHEN user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.is_tpo_for_student(user_id::uuid)
    ELSE false
  END);

DROP POLICY IF EXISTS "TPOs can read cohort scores" ON public.leaderboard_scores;
CREATE POLICY "TPOs can read cohort scores"
  ON public.leaderboard_scores FOR SELECT TO authenticated
  USING (CASE
    WHEN user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.is_tpo_for_student(user_id::uuid)
    ELSE false
  END);

-- user_streaks is optional in older deployments, so install its policy only
-- when the table exists.
DO $policy$
BEGIN
  IF to_regclass('public.user_streaks') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "TPOs can read cohort streaks" ON public.user_streaks';
    EXECUTE $sql$
      CREATE POLICY "TPOs can read cohort streaks"
        ON public.user_streaks FOR SELECT TO authenticated
        USING (CASE
          WHEN user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            THEN public.is_tpo_for_student(user_id::uuid)
          ELSE false
        END)
    $sql$;
    EXECUTE 'GRANT SELECT ON public.user_streaks TO authenticated';
  END IF;
END
$policy$;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_progress TO authenticated;
GRANT SELECT ON public.leaderboard_scores TO authenticated;
