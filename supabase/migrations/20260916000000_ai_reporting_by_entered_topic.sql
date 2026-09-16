-- AI-practice reporting is organised by the topic entered by the student.
-- Replace the earlier per-question AI classification with a stable topic bucket.
-- Topic matching ignores case and repeated whitespace, while categoryName/topic
-- preserve the student's text for display.
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
      count(*) filter (where correct) as correct
    from latest group by user_id, topic_key, level
  ), category_summary as (
    select user_id, jsonb_agg(jsonb_build_object(
      'categoryId', 'topic:' || md5(topic_key),
      'categoryName', topic,
      'topic', topic,
      'level', level,
      'questions', questions,
      'correct', correct
    ) order by topic_key, level) as categories
    from groups group by user_id
  ), totals as (
    select user_id, count(*) as sessions, max(completed_at) as last_completed
    from attempts group by user_id
  ), unique_totals as (
    select user_id, count(*) as questions from latest group by user_id
  )
  select t.user_id, t.sessions, coalesce(u.questions, 0), t.last_completed,
    coalesce(c.categories, '[]'::jsonb)
  from totals t
  left join unique_totals u using(user_id)
  left join category_summary c using(user_id);
$$;

revoke all on function public.tpo_ai_summary(uuid) from public;
grant execute on function public.tpo_ai_summary(uuid) to authenticated;
