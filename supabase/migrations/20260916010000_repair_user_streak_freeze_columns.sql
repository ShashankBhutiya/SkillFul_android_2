-- The streak table predates migrations in some production projects. Repair
-- columns used by the current client and by AI generation quota bonuses.
ALTER TABLE IF EXISTS public.user_streaks
  ADD COLUMN IF NOT EXISTS freezes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freezes_used TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS history TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_days INTEGER NOT NULL DEFAULT 0;
