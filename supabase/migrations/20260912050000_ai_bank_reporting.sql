-- Requires ai_practice and institution membership migrations.
-- Private, reusable question bank. Only the Edge Function's service role accesses it.
create table public.ai_question_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  context_key text not null,
  topic_key text not null,
  question_key text not null,
  question jsonb not null,
  model text not null,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  last_served_at timestamptz,
  unique(user_id, context_key, topic_key, question_key)
);
alter table public.ai_question_bank enable row level security;
revoke all on public.ai_question_bank from anon, authenticated;
grant all on public.ai_question_bank to service_role;
create index ai_bank_lookup on public.ai_question_bank(user_id, context_key, topic_key, last_served_at) where not disabled;
alter table public.ai_question_sets add column reused_count integer not null default 0;

-- Grade every new completed attempt from the immutable, owned question set.
-- Do not trust client-provided correctness, totals or completion dates.
create or replace function public.grade_ai_attempt()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  saved public.ai_question_sets;
  q jsonb; a jsonb; selected integer; expected integer;
  graded jsonb := '[]'::jsonb; correct_count integer := 0;
begin
  select * into saved from public.ai_question_sets
    where id = new.question_set_id and user_id = new.user_id;
  if not found then raise exception 'Practice set does not belong to this student'; end if;
  if jsonb_typeof(new.answers) <> 'array' or jsonb_array_length(new.answers) < 1 or jsonb_array_length(new.answers) > jsonb_array_length(saved.questions) then
    raise exception 'Invalid number of answers';
  end if;
  if (select count(distinct x->>'questionId') from jsonb_array_elements(new.answers) x) <> jsonb_array_length(new.answers) then
    raise exception 'Duplicate answers';
  end if;
  for a in select item.value from jsonb_array_elements(new.answers) item loop
    select item.value into q from jsonb_array_elements(saved.questions) item
      where item.value->>'id' = a->>'questionId';
    if q is null or jsonb_typeof(a->'selectedOption') <> 'number' or (a->>'selectedOption') !~ '^[0-9]+$' then
      raise exception 'Missing or invalid answer';
    end if;
    selected := (a->>'selectedOption')::integer;
    if q ? 'statement' then
      if selected not in (0,1) then raise exception 'Invalid true/false answer'; end if;
      expected := case when (q->>'answer')::boolean then 1 else 0 end;
    else
      if selected < 0 or selected >= jsonb_array_length(q->'options') then raise exception 'Invalid option'; end if;
      expected := (q->>'correctOption')::integer;
    end if;
    if selected = expected then correct_count := correct_count + 1; end if;
    graded := graded || jsonb_build_array(jsonb_build_object('questionId',q->>'id','selectedOption',selected,'correct',selected=expected));
  end loop;
  if jsonb_array_length(graded) <> jsonb_array_length(new.answers) then raise exception 'Unknown question'; end if;
  new.answers := graded;
  new.score := correct_count;
  new.total_questions := jsonb_array_length(graded);
  new.completed_at := now();
  return new;
end $$;
revoke all on function public.grade_ai_attempt() from public;
create trigger grade_ai_attempt before insert on public.ai_practice_attempts
  for each row execute function public.grade_ai_attempt();
grant insert on public.ai_practice_attempts to authenticated;
drop policy if exists "Users can insert own AI attempts" on public.ai_practice_attempts;
create policy "Users can insert own AI attempts" on public.ai_practice_attempts for insert to authenticated
  with check (auth.uid() = user_id and exists (
    select 1 from public.ai_question_sets s where s.id = question_set_id and s.user_id = auth.uid()
  ));

-- Security invoker preserves table RLS. Explicit institution membership also scopes
-- the request. Aggregate in Postgres so large cohorts are never truncated at 1,000 attempts.
create or replace function public.tpo_ai_summary(p_institution_id uuid)
returns table(user_id uuid, sessions bigint, unique_questions bigint, last_completed timestamptz, categories jsonb)
language sql stable security invoker set search_path = public as $$
  with attempts as (
    select a.* from public.ai_practice_attempts a
    join public.institution_members m on m.user_id::text = a.user_id::text
      and m.institution_id = p_institution_id and m.role = 'student'
    where public.is_tpo_for_institution(p_institution_id)
  ), answered as (
    select a.user_id, a.id, a.completed_at, s.level,
      lower(regexp_replace(trim(s.topic), '\s+', ' ', 'g')) as topic_key,
      trim(s.topic) as topic,
      md5(lower(regexp_replace(trim(coalesce(q->>'statement', q->>'question')), '\s+', ' ', 'g'))) as question_key,
      case when q ? 'statement' then
        (ans->>'selectedOption') = case when (q->>'answer')::boolean then '1' else '0' end
      else (ans->>'selectedOption') = (q->>'correctOption') end as correct
    from attempts a join public.ai_question_sets s on s.id = a.question_set_id and s.user_id = a.user_id
    cross join lateral jsonb_array_elements(s.questions) q
    cross join lateral jsonb_array_elements(a.answers) ans
    where ans->>'questionId' = q->>'id'
  ), latest as (
    select distinct on (user_id, topic_key, question_key) * from answered
    order by user_id, topic_key, question_key, completed_at desc, id desc
  ), groups as (
    select user_id, topic_key, max(topic) as topic, level, count(*) as questions,
      count(*) filter (where correct) as correct from latest group by user_id, topic_key, level
  ), category_summary as (
    select user_id, jsonb_agg(jsonb_build_object(
      'categoryId', 'topic:' || md5(topic_key),
      'categoryName', topic,
      'topic', topic,
      'level', level,
      'questions', questions,
      'correct', correct
    ) order by topic_key, level) as categories from groups group by user_id
  ), totals as (
    select user_id, count(*) as sessions, max(completed_at) as last_completed from attempts group by user_id
  ), unique_totals as (
    select user_id, count(*) as questions from latest group by user_id
  )
  select t.user_id, t.sessions, coalesce(u.questions,0), t.last_completed, coalesce(c.categories,'[]'::jsonb)
    from totals t left join unique_totals u using(user_id) left join category_summary c using(user_id);
$$;
revoke all on function public.tpo_ai_summary(uuid) from public;
grant execute on function public.tpo_ai_summary(uuid) to authenticated;

-- Cached sets do not consume an AI provider call. Preserve the existing daily
-- reservation limit while excluding fully reused sets from initial counts.
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


