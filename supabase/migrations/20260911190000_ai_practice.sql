-- AI-generated student practice sets and completed attempts.

CREATE TABLE IF NOT EXISTS public.ai_question_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  degree TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  question_count INTEGER NOT NULL CHECK (question_count IN (5, 10, 15)),
  questions JSONB NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_question_sets_user_created
  ON public.ai_question_sets (user_id, created_at DESC);

ALTER TABLE public.ai_question_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own AI question sets" ON public.ai_question_sets;
CREATE POLICY "Users can read own AI question sets"
  ON public.ai_question_sets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "TPOs can read cohort AI question sets" ON public.ai_question_sets;
CREATE POLICY "TPOs can read cohort AI question sets"
  ON public.ai_question_sets FOR SELECT TO authenticated
  USING (public.is_tpo_for_student(user_id));

CREATE TABLE IF NOT EXISTS public.ai_practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question_set_id UUID NOT NULL REFERENCES public.ai_question_sets(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_practice_attempts_user_completed
  ON public.ai_practice_attempts (user_id, completed_at DESC);

ALTER TABLE public.ai_practice_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own AI attempts" ON public.ai_practice_attempts;
CREATE POLICY "Users can read own AI attempts"
  ON public.ai_practice_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "TPOs can read cohort AI attempts" ON public.ai_practice_attempts;
CREATE POLICY "TPOs can read cohort AI attempts"
  ON public.ai_practice_attempts FOR SELECT TO authenticated
  USING (public.is_tpo_for_student(user_id));
DROP POLICY IF EXISTS "Users can insert own AI attempts" ON public.ai_practice_attempts;
CREATE POLICY "Users can insert own AI attempts"
  ON public.ai_practice_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON public.ai_question_sets TO authenticated;
GRANT SELECT ON public.ai_practice_attempts TO authenticated;
