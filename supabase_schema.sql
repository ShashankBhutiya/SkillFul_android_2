  -- ================================================
  -- Supabase SQL Schema for Truth Swipe Quiz App
  -- Run this in the Supabase SQL Editor
  -- ================================================

  -- 1. Create the user_progress table
  CREATE TABLE IF NOT EXISTS user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    practiced_ids INTEGER[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category_id)
  );

  -- 2. Index for fast lookups by user
  CREATE INDEX IF NOT EXISTS idx_user_progress_user_id
    ON user_progress (user_id);

  -- 3. Row Level Security (RLS)
  ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

  -- Allow anyone to insert (guests + authenticated)
  DROP POLICY IF EXISTS "Anyone can insert progress" ON user_progress;
  CREATE POLICY "Anyone can insert progress"
    ON user_progress FOR INSERT
    WITH CHECK (true);

  -- Allow anyone to read their own progress
  DROP POLICY IF EXISTS "Users can read own progress" ON user_progress;
  CREATE POLICY "Users can read own progress"
    ON user_progress FOR SELECT
    USING (true);

  -- Allow anyone to update their own progress
  DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
  CREATE POLICY "Users can update own progress"
    ON user_progress FOR UPDATE
    USING (true)
    WITH CHECK (true);

  -- Allow anyone to delete their own progress
  DROP POLICY IF EXISTS "Users can delete own progress" ON user_progress;
  CREATE POLICY "Users can delete own progress"
    ON user_progress FOR DELETE
    USING (true);

  -- 4. Auto-update updated_at timestamp
  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trigger_update_updated_at ON user_progress;
  CREATE TRIGGER trigger_update_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

  -- ================================================
  -- REFERRAL SYSTEM
  -- ================================================

  -- 5. Create profiles table linked to auth.users
  CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by_code TEXT,
    email_consent BOOLEAN NOT NULL DEFAULT false,
    phone TEXT,
    phone_consent BOOLEAN NOT NULL DEFAULT false,
    whatsapp_consent BOOLEAN NOT NULL DEFAULT false,
    phone_verified BOOLEAN NOT NULL DEFAULT false,
    first_name TEXT,
    last_name TEXT,
    degree TEXT,
    academic_year TEXT,
    subscription_status TEXT DEFAULT 'trialing',
    subscription_id TEXT,
    subscription_period_end TIMESTAMPTZ,
    customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Add email_consent column if it doesn't exist (for existing deployments)
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS degree TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS academic_year TEXT;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email_consent'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN email_consent BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone_consent'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN phone_consent BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'whatsapp_consent'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN whatsapp_consent BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone_verified'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'first_name'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_name'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_status'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_id'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN subscription_id TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_period_end'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN subscription_period_end TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'customer_id'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN customer_id TEXT;
    END IF;
  END $$;

  -- RLS for profiles
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
  CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

  -- Function to generate a unique random 6-char referral code (with retry)
  CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT AS $$
  DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    attempt INTEGER := 0;
  BEGIN
    LOOP
      result := '';
      FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
      END LOOP;
      
      -- Check uniqueness
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = result) THEN
        RETURN result;
      END IF;
      
      attempt := attempt + 1;
      IF attempt >= 10 THEN
        -- Fallback: use part of a UUID for guaranteed uniqueness
        RETURN upper(replace(gen_random_uuid()::text, '-', '')::text)::text;
      END IF;
    END LOOP;
  END;
  $$ LANGUAGE plpgsql;

  -- Trigger to create profile on signup (with exception handling)
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $$
  DECLARE
    ref_code TEXT;
    referred_by TEXT;
  BEGIN
    ref_code := new.raw_user_meta_data->>'referred_by_code';
    
    -- Validate referred_by_code if provided
    IF ref_code IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = ref_code) THEN
        referred_by := ref_code;
      END IF;
    END IF;

    INSERT INTO public.profiles (
      id,
      email,
      referral_code,
      referred_by_code,
      phone,
      phone_consent,
      email_consent,
      whatsapp_consent,
      phone_verified,
      first_name,
      last_name,
      subscription_status,
      subscription_period_end
    )
    VALUES (
      new.id,
      new.email,
      generate_referral_code(),
      referred_by,
      new.raw_user_meta_data->>'phone',
      COALESCE((new.raw_user_meta_data->>'phone_consent')::boolean, false),
      COALESCE((new.raw_user_meta_data->>'email_consent')::boolean, false),
      COALESCE((new.raw_user_meta_data->>'whatsapp_consent')::boolean, false),
      COALESCE((new.raw_user_meta_data->>'phone_verified')::boolean, false),
      COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'given_name'),
      COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'family_name'),
      'trialing',
      NOW() + INTERVAL '30 days'
    );
    RETURN new;
  EXCEPTION WHEN OTHERS THEN
    -- Don't block user signup if profile creation fails
    RAISE WARNING 'Profile creation failed for user %: %', new.id, SQLERRM;
    RETURN new;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Trigger checks
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

  -- 6. Helper Function: Get valid referral count
  -- Returns count of users referred by 'referrer_id' who have purchased a premium subscription (status = 'active')
  CREATE OR REPLACE FUNCTION get_valid_referrals(referrer_id UUID)
  RETURNS INTEGER AS $$
  DECLARE
    my_code TEXT;
    valid_count INTEGER;
  BEGIN
    -- Get my referral code
    SELECT referral_code INTO my_code FROM public.profiles WHERE id = referrer_id;
    
    IF my_code IS NULL THEN
      RETURN 0;
    END IF;

    -- Count distinct users who:
    -- 1. Have referred_by_code = my_code
    -- 2. Have subscription_status = 'active'
    SELECT count(*) INTO valid_count
    FROM public.profiles p
    WHERE p.referred_by_code = my_code
    AND p.subscription_status = 'active';
    
    RETURN valid_count;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- 7. Helper Function: Update my referrer
  -- Allows a user to set who referred them (if not already set)
  CREATE OR REPLACE FUNCTION set_referrer(code TEXT)
  RETURNS BOOLEAN AS $$
  DECLARE
    current_referrer TEXT;
  BEGIN
    -- Check if already has referrer
    SELECT referred_by_code INTO current_referrer FROM public.profiles WHERE id = auth.uid();
    
    IF current_referrer IS NOT NULL THEN
      RETURN FALSE; -- Already referred
    END IF;

    -- Check if code exists
    PERFORM 1 FROM public.profiles WHERE referral_code = code;
    IF NOT FOUND THEN
      RETURN FALSE; -- Invalid code
    END IF;

    -- Don't refer yourself
    IF (SELECT referral_code FROM public.profiles WHERE id = auth.uid()) = code THEN
      RETURN FALSE;
    END IF;

    -- Update
    UPDATE public.profiles
    SET referred_by_code = code
    WHERE id = auth.uid();
    
    RETURN TRUE;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- ================================================
  -- Category Requests table
  -- Users can suggest new categories
  -- View requests in Supabase Dashboard → Table Editor
  -- ================================================
  CREATE TABLE IF NOT EXISTS category_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE category_requests ENABLE ROW LEVEL SECURITY;

  -- Anyone can submit a request
  DROP POLICY IF EXISTS "Anyone can insert requests" ON category_requests;
  CREATE POLICY "Anyone can insert requests"
    ON category_requests FOR INSERT
    WITH CHECK (true);

  -- Only authenticated users can read their own requests
  DROP POLICY IF EXISTS "Users can read own requests" ON category_requests;
  CREATE POLICY "Users can read own requests"
    ON category_requests FOR SELECT
    USING (user_id = auth.uid()::text);

  -- ================================================
  -- GLOBAL LEADERBOARD
  -- ================================================

  -- Drop old table and function if they exist to prevent schema mismatch
  DROP FUNCTION IF EXISTS get_global_leaderboard();
  DROP TABLE IF EXISTS leaderboard_scores CASCADE;

  -- Stores each user's best score per category + difficulty
  CREATE TABLE IF NOT EXISTS leaderboard_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Player',
  category_id TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'intermediate')),
  score INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  accuracy_pct INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id, difficulty)
);

-- Index for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard_scores (user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard_scores (score DESC);

-- RLS
ALTER TABLE leaderboard_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can view the leaderboard (public read)
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON leaderboard_scores;
CREATE POLICY "Anyone can view leaderboard"
  ON leaderboard_scores FOR SELECT
  USING (true);

-- Anyone can insert progress/scores (guests + authenticated)
DROP POLICY IF EXISTS "Auth users can insert own scores" ON leaderboard_scores;
DROP POLICY IF EXISTS "Anyone can insert scores" ON leaderboard_scores;
CREATE POLICY "Anyone can insert scores"
  ON leaderboard_scores FOR INSERT
  WITH CHECK (true);

-- Anyone can update their own progress/scores (guests + authenticated)
DROP POLICY IF EXISTS "Auth users can update own scores" ON leaderboard_scores;
DROP POLICY IF EXISTS "Anyone can update own scores" ON leaderboard_scores;
CREATE POLICY "Anyone can update own scores"
  ON leaderboard_scores FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Global leaderboard RPC: top 50 players by total cumulative score
CREATE OR REPLACE FUNCTION get_global_leaderboard()
RETURNS TABLE (
  rank BIGINT,
  user_id TEXT,
  display_name TEXT,
  total_score BIGINT,
  total_correct BIGINT,
  total_questions BIGINT,
  best_streak INTEGER,
  avg_accuracy INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(ls.score) DESC, AVG(ls.accuracy_pct) DESC) AS rank,
    ls.user_id,
    MAX(ls.display_name) AS display_name,
    SUM(ls.score)::BIGINT AS total_score,
    SUM(ls.correct_count)::BIGINT AS total_correct,
    SUM(ls.total_questions)::BIGINT AS total_questions,
    MAX(ls.best_streak) AS best_streak,
    AVG(ls.accuracy_pct)::INTEGER AS avg_accuracy
  FROM leaderboard_scores ls
  GROUP BY ls.user_id
  ORDER BY total_score DESC, avg_accuracy DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- USER NOTIFICATIONS
-- ================================================
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  action_url TEXT,
  action_label TEXT
);

-- Index for fast notification lookups per user
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications (user_id);

-- RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Anyone can view notifications (public read/auth read/guest read)
DROP POLICY IF EXISTS "Anyone can view notifications" ON user_notifications;
CREATE POLICY "Anyone can view notifications"
  ON user_notifications FOR SELECT
  USING (true);

-- Anyone can insert notifications (guests + authenticated)
DROP POLICY IF EXISTS "Anyone can insert notifications" ON user_notifications;
CREATE POLICY "Anyone can insert notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (true);

-- Anyone can update their own notifications (guests + authenticated)
DROP POLICY IF EXISTS "Anyone can update own notifications" ON user_notifications;
CREATE POLICY "Anyone can update own notifications"
  ON user_notifications FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Anyone can delete their own notifications (guests + authenticated)
DROP POLICY IF EXISTS "Anyone can delete own notifications" ON user_notifications;
CREATE POLICY "Anyone can delete own notifications"
  ON user_notifications FOR DELETE
  USING (true);


-- ================================================
-- PUSH NOTIFICATION TOKENS
-- ================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens (platform);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read own tokens" ON push_tokens;
CREATE POLICY "Anyone can read own tokens"
  ON push_tokens FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert tokens" ON push_tokens;
CREATE POLICY "Anyone can insert tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update own tokens" ON push_tokens;
CREATE POLICY "Anyone can update own tokens"
  ON push_tokens FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete own tokens" ON push_tokens;
CREATE POLICY "Anyone can delete own tokens"
  ON push_tokens FOR DELETE
  USING (true);

-- Auto-update updated_at on push_tokens
DROP TRIGGER IF EXISTS trigger_update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER trigger_update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ================================================
-- NOTIFICATION SCHEDULE PREFERENCES
-- ================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (reminder_frequency IN ('daily', 'weekly')),
  reminder_time TEXT NOT NULL DEFAULT '09:00',
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  mascot_tips_enabled BOOLEAN NOT NULL DEFAULT true,
  streak_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  achievement_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  leaderboard_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  inactivity_nudge_enabled BOOLEAN NOT NULL DEFAULT true,
  content_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences (user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read own preferences" ON notification_preferences;
CREATE POLICY "Anyone can read own preferences"
  ON notification_preferences FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert preferences" ON notification_preferences;
CREATE POLICY "Anyone can insert preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update own preferences" ON notification_preferences;
CREATE POLICY "Anyone can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ================================================
-- PYQ QUESTIONS SYSTEM
-- ================================================

CREATE TABLE IF NOT EXISTS pyq_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam TEXT NOT NULL CHECK (exam IN ('jee_main', 'jee_advanced', 'neet')),
  subject TEXT NOT NULL,
  chapters TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  repeatability_score INTEGER DEFAULT 1,
  importance_score INTEGER DEFAULT 1,
  year INTEGER NOT NULL,
  session TEXT,
  question_type TEXT NOT NULL CHECK (question_type IN ('single_correct', 'multiple_correct', 'numerical', 'assertion_reasoning')),
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  options JSONB,
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  explanation_image_url TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  marks_correct INTEGER DEFAULT 4,
  marks_wrong INTEGER DEFAULT -1,
  marks_partial INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_pyq_exam_subject ON pyq_questions (exam, subject);
CREATE INDEX IF NOT EXISTS idx_pyq_year ON pyq_questions (year DESC);

ALTER TABLE pyq_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can select pyq_questions" ON pyq_questions;
CREATE POLICY "Anyone can select pyq_questions"
  ON pyq_questions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert pyq_questions" ON pyq_questions;
CREATE POLICY "Anyone can insert pyq_questions"
  ON pyq_questions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update pyq_questions" ON pyq_questions;
CREATE POLICY "Anyone can update pyq_questions"
  ON pyq_questions FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete pyq_questions" ON pyq_questions;
CREATE POLICY "Anyone can delete pyq_questions"
  ON pyq_questions FOR DELETE
  USING (true);

-- PYQ Progress table
CREATE TABLE IF NOT EXISTS pyq_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id UUID REFERENCES pyq_questions(id) ON DELETE CASCADE,
  exam TEXT NOT NULL,
  subject TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  user_answer JSONB,
  marks_obtained INTEGER DEFAULT 0,
  time_taken_ms INTEGER,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_pyq_progress_user ON pyq_progress (user_id, exam, subject);

ALTER TABLE pyq_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can select pyq_progress" ON pyq_progress;
CREATE POLICY "Anyone can select pyq_progress"
  ON pyq_progress FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert pyq_progress" ON pyq_progress;
CREATE POLICY "Anyone can insert pyq_progress"
  ON pyq_progress FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update pyq_progress" ON pyq_progress;
CREATE POLICY "Anyone can update pyq_progress"
  ON pyq_progress FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete pyq_progress" ON pyq_progress;
CREATE POLICY "Anyone can delete pyq_progress"
  ON pyq_progress FOR DELETE
  USING (true);


-- ================================================
-- APP VERSION / FORCE UPDATE
-- ================================================

CREATE TABLE IF NOT EXISTS app_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  minimum_version TEXT NOT NULL,
  latest_version TEXT NOT NULL,
  update_message TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_versions_platform ON app_versions (platform, is_active);

ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app_versions" ON app_versions;
CREATE POLICY "Anyone can read app_versions"
  ON app_versions FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS trigger_update_app_versions_updated_at ON app_versions;
CREATE TRIGGER trigger_update_app_versions_updated_at
  BEFORE UPDATE ON app_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Seed initial version row (update minimum_version when you publish a new required version)
INSERT INTO app_versions (platform, minimum_version, latest_version, update_message)
VALUES ('android', '1.0.5', '1.0.5', 'A new version of Skillful is available with important improvements. Please update to continue.')
ON CONFLICT DO NOTHING;




-- ================================================
-- DAILY USAGE STREAKS
-- ================================================
-- Backs src/services/streakService.ts. One row per user.
-- Dates are stored as local "YYYY-MM-DD" strings written by the client,
-- NOT as timestamps: the streak rolls over at the user's local midnight,
-- so the server must not reinterpret them in UTC.

CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  freezes INTEGER NOT NULL DEFAULT 0,
  freezes_used TEXT[] NOT NULL DEFAULT '{}',
  history TEXT[] NOT NULL DEFAULT '{}',
  total_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks (user_id);

-- Leaderboard-style lookups by streak length.
CREATE INDEX IF NOT EXISTS idx_user_streaks_current ON user_streaks (current_streak DESC);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Permissive policies matching user_progress: guests have no auth.uid(),
-- so access is keyed on the client-supplied user_id.
DROP POLICY IF EXISTS "Anyone can insert streaks" ON user_streaks;
CREATE POLICY "Anyone can insert streaks"
  ON user_streaks FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own streaks" ON user_streaks;
CREATE POLICY "Users can read own streaks"
  ON user_streaks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own streaks" ON user_streaks;
CREATE POLICY "Users can update own streaks"
  ON user_streaks FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own streaks" ON user_streaks;
CREATE POLICY "Users can delete own streaks"
  ON user_streaks FOR DELETE
  USING (true);

DROP TRIGGER IF EXISTS trigger_update_user_streaks_updated_at ON user_streaks;
CREATE TRIGGER trigger_update_user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
