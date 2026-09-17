-- Run on a local/test database after migrations, as postgres. Rolls back fixtures.
BEGIN;
DO $$
DECLARE
  v_user UUID := gen_random_uuid();
  v_result JSONB;
BEGIN
  INSERT INTO auth.users (id) VALUES (v_user);
  v_result := public.reserve_ai_generation(v_user, 2);
  ASSERT (v_result->>'allowed')::boolean, 'First attempt must be allowed';
  ASSERT (v_result->>'remaining')::integer = 1, 'First attempt consumes quota';

  v_result := public.reserve_ai_generation(v_user, 2);
  ASSERT v_result->>'reason' = 'cooldown', 'Immediate retry must be blocked';
  ASSERT (v_result->>'retryAfter')::integer BETWEEN 1 AND 60, 'Return a bounded retry delay';
  ASSERT (SELECT attempts FROM public.ai_generation_usage WHERE user_id = v_user) = 1, 'Rejected retries must not consume quota';

  UPDATE public.ai_generation_usage SET last_requested_at = clock_timestamp() - interval '61 seconds' WHERE user_id = v_user;
  v_result := public.reserve_ai_generation(v_user, 2);
  ASSERT (v_result->>'allowed')::boolean, 'Retry after cooldown must be allowed';
  v_result := public.reserve_ai_generation(v_user, 2);
  ASSERT v_result->>'reason' = 'daily_quota', 'Daily quota must block further attempts';

  UPDATE public.ai_generation_usage SET usage_date = usage_date - 1 WHERE user_id = v_user;
  v_result := public.reserve_ai_generation(v_user, 2);
  ASSERT v_result->>'reason' = 'cooldown', 'Cooldown must survive midnight';
  UPDATE public.ai_generation_usage SET last_requested_at = clock_timestamp() - interval '61 seconds' WHERE user_id = v_user;
  v_result := public.reserve_ai_generation(v_user, 2);
  ASSERT (v_result->>'allowed')::boolean, 'New UTC day must reset quota';
  ASSERT (v_result->>'remaining')::integer = 1, 'New day must start with one attempt';

  -- At 1,000 questions, at most 100 ten-question reservations are allowed.
  UPDATE public.ai_generation_usage SET attempts = 99, last_requested_at = clock_timestamp() - interval '61 seconds' WHERE user_id = v_user;
  v_result := public.reserve_ai_generation(v_user, 100);
  ASSERT (v_result->>'allowed')::boolean, 'Final ten questions should fit';
  ASSERT (v_result->>'remaining')::integer = 0, '1,000-question quota must be exhausted';
  v_result := public.reserve_ai_generation(v_user, 100);
  ASSERT v_result->>'reason' = 'daily_quota', 'Cannot generate more than 1,000 questions';

  BEGIN
    PERFORM public.reserve_ai_generation(v_user, 101);
    RAISE EXCEPTION 'Expected oversized quota rejection';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Invalid daily generation limit' THEN RAISE; END IF;
  END;

  ASSERT NOT has_function_privilege('authenticated', 'public.reserve_ai_generation(uuid,integer)', 'EXECUTE'), 'Clients cannot reserve or override quota directly';
  ASSERT NOT has_table_privilege('authenticated', 'public.ai_generation_usage', 'UPDATE'), 'Clients cannot reset usage';
END;
$$;
ROLLBACK;
