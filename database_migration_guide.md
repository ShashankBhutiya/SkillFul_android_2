# Exhaustive Supabase Database Migration Guide

This document provides step-by-step instructions to migrate both the schema and data from your old Supabase database to a brand new Supabase database, without requiring your database password.

---

## Phase 1: Set Up the New Supabase Project

1. Log into [Supabase](https://supabase.com/).
2. Click **New Project** and select your Organization.
3. Configure the project:
   * **Name**: `Truth Swipe Quiz` (or your preferred name)
   * **Database Password**: Choose a strong password and save it securely.
   * **Region**: Select the region closest to your users.
   * **Pricing Plan**: Choose Free (or your preferred tier).
4. Wait a few minutes for the project to provision.
5. Once ready, go to **Project Settings** (gear icon on bottom left) → **API**:
   * Copy the **Project URL** (we will need this for your `.env` file).
   * Copy the **anon / public** key (we will need this for your `.env` file).

---

## Phase 2: Export Data from the Old Database

Go to your **old** Supabase project dashboard, navigate to **SQL Editor**, click **New Query**, and run each of the queries below one by one. 

For each query, once the results are displayed, click the **Export** button at the bottom right of the results pane and select **Export to JSON** (save the files locally in your project folder).

### 1. Export `auth.users`
* **Query:**
  ```sql
  SELECT id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
  FROM auth.users;
  ```
* **Save as:** `auth_users.json`

### 2. Export `public.user_progress`
* **Query:**
  ```sql
  SELECT id, user_id, category_id, practiced_ids, created_at, updated_at
  FROM public.user_progress;
  ```
* **Save as:** `user_progress.json`

### 3. Export `public.category_requests`
* **Query:**
  ```sql
  SELECT id, user_id, category_name, description, created_at
  FROM public.category_requests;
  ```
* **Save as:** `category_requests.json`

### 4. Export `public.leaderboard_scores`
* **Query:**
  ```sql
  SELECT id, user_id, display_name, category_id, difficulty, score, correct_count, total_questions, best_streak, accuracy_pct, played_at
  FROM public.leaderboard_scores;
  ```
* **Save as:** `leaderboard_scores.json`

---

## Phase 3: Restore Schema & Data in the New Database

Go to your **new** Supabase project dashboard, navigate to **SQL Editor**, and perform the following steps:

### Step 3.1: Create the Tables & Schema
1. Click **New Query**.
2. Open the file [supabase_schema.sql](file:///c:/Users/shash/Music/truth-swipe-main-final/supabase_schema.sql) in your code editor, copy the entire file contents, paste them into the SQL Editor, and click **Run**.
3. Confirm that the execution finishes successfully. This sets up all tables, indexes, triggers, and functions.

### Step 3.2: Import the JSON Data
For each table below, open the corresponding JSON file you exported in **Phase 2**, copy its entire content, paste it into the placeholder `'[...]::json'` (keep the single quotes), and click **Run**.

We use `ON CONFLICT (id) DO NOTHING` to ensure that if a query is run multiple times or has overlaps, it will skip duplicate records without erroring out.

#### 1. Restore Users (`auth_users.json`)
*Running this will automatically generate corresponding records in `public.profiles` using the trigger we set up.*
```sql
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
SELECT id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
FROM json_populate_recordset(null::auth.users, '
[
  -- PASTE THE CONTENTS OF auth_users.json HERE
]
'::json)
ON CONFLICT (id) DO NOTHING;
```

#### 2. Restore User Progress (`user_progress.json`)
```sql
INSERT INTO public.user_progress (id, user_id, category_id, practiced_ids, created_at, updated_at)
SELECT 
  (row->>'id')::uuid,
  row->>'user_id',
  row->>'category_id',
  COALESCE(
    (
      SELECT array_agg(val::integer)
      FROM json_array_elements_text(COALESCE(row->'practiced_ids', '[]'::json)) AS val
      WHERE val ~ '^[0-9]+$'
    ),
    '{}'::integer[]
  ) AS practiced_ids,
  (row->>'created_at')::timestamptz,
  (row->>'updated_at')::timestamptz
FROM json_array_elements('
[
  -- PASTE THE CONTENTS OF user_progress.json HERE
]
'::json) AS row
ON CONFLICT (id) DO NOTHING;
```

#### 3. Restore Category Requests (`category_requests.json`)
```sql
INSERT INTO public.category_requests (id, user_id, category_name, description, created_at)
SELECT id, user_id, category_name, description, created_at
FROM json_populate_recordset(null::public.category_requests, '
[
  -- PASTE THE CONTENTS OF category_requests.json HERE
]
'::json)
ON CONFLICT (id) DO NOTHING;
```

#### 4. Restore Leaderboard Scores (`leaderboard_scores.json`)
```sql
INSERT INTO public.leaderboard_scores (id, user_id, display_name, category_id, difficulty, score, correct_count, total_questions, best_streak, accuracy_pct, played_at)
SELECT id, user_id, display_name, category_id, difficulty, score, correct_count, total_questions, best_streak, accuracy_pct, played_at
FROM json_populate_recordset(null::public.leaderboard_scores, '
[
  -- PASTE THE CONTENTS OF leaderboard_scores.json HERE
]
'::json)
ON CONFLICT (id) DO NOTHING;
```

---

## Phase 4: Point Application to the New Database

1. Open your local [.env](file:///c:/Users/shash/Music/truth-swipe-main-final/.env) file.
2. Replace `VITE_SUPABASE_URL` with your new project's **API URL**.
3. Replace `VITE_SUPABASE_ANON_KEY` with your new project's **anon / public key**.
4. Restart your development server (`npm run dev`) and test logging in.
