-- Reuse AI-generated practice questions across students with the same
-- degree/year/level context and normalised topic. Saved sets and attempts
-- remain user-owned; only the service-role Edge Function can read this bank.
CREATE INDEX IF NOT EXISTS ai_bank_shared_lookup
  ON public.ai_question_bank(context_key, topic_key, last_served_at)
  WHERE NOT disabled;
