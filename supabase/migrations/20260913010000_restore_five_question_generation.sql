-- Restore five-question reservation limits. Keep question_count = 1 valid for saved history.
CREATE OR REPLACE FUNCTION public.reserve_ai_generation(p_user_id UUID, p_daily_limit INTEGER DEFAULT 8)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ;
  v_date DATE;
  v_usage public.ai_generation_usage%ROWTYPE;
  v_retry INTEGER;
BEGIN
  IF p_daily_limit IS NULL OR p_daily_limit < 1 OR p_daily_limit > 60 THEN
    RAISE EXCEPTION 'Invalid daily generation limit';
  END IF;

  INSERT INTO public.ai_generation_usage (user_id, usage_date, attempts, last_requested_at)
  SELECT p_user_id, (clock_timestamp() AT TIME ZONE 'UTC')::date, count(*)::integer, max(created_at)
  FROM public.ai_question_sets
  WHERE reused_count < question_count
    AND user_id = p_user_id
    AND created_at >= date_trunc('day', clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_usage FROM public.ai_generation_usage WHERE user_id = p_user_id FOR UPDATE;
  v_now := clock_timestamp();
  v_date := (v_now AT TIME ZONE 'UTC')::date;
  IF v_usage.usage_date <> v_date THEN
    v_usage.attempts := 0;
  END IF;

  IF v_usage.attempts >= p_daily_limit THEN
    v_retry := greatest(1, ceil(extract(epoch FROM ((v_date + 1)::timestamp AT TIME ZONE 'UTC') - v_now))::integer);
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_quota', 'retryAfter', v_retry);
  END IF;
  IF v_usage.last_requested_at IS NOT NULL AND v_usage.last_requested_at + interval '60 seconds' > v_now THEN
    v_retry := greatest(1, ceil(extract(epoch FROM v_usage.last_requested_at + interval '60 seconds' - v_now))::integer);
    RETURN jsonb_build_object('allowed', false, 'reason', 'cooldown', 'retryAfter', v_retry);
  END IF;

  UPDATE public.ai_generation_usage
  SET usage_date = v_date, attempts = v_usage.attempts + 1, last_requested_at = v_now
  WHERE user_id = p_user_id;
  RETURN jsonb_build_object('allowed', true, 'remaining', greatest(0, p_daily_limit - v_usage.attempts - 1));
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_generation(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_generation(UUID, INTEGER) TO service_role;



