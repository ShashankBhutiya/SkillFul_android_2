-- One lifetime AI-generated practice set for users without Premium.
-- The reservation table makes concurrent requests unable to claim two trials.
CREATE TABLE IF NOT EXISTS public.student_ai_trial_reservations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_ai_trial_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_ai_trial_reservations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.student_ai_trial_reservations TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_student_ai_trial(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER;
BEGIN
  -- Existing generated sets already count as the user's trial.
  IF EXISTS (
    SELECT 1 FROM public.ai_question_sets WHERE user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'trial_used');
  END IF;

  -- Let a user retry if a function invocation died before it could either save
  -- the set or release its reservation.
  DELETE FROM public.student_ai_trial_reservations
  WHERE user_id = p_user_id
    AND reserved_at < now() - interval '15 minutes';

  INSERT INTO public.student_ai_trial_reservations (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'trial_used');
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_student_ai_trial(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_student_ai_trial(UUID) TO service_role;
