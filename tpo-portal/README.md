# SkillFul for Institutions — TPO Dashboard

This is a separate Vite website for Training & Placement Officers. It deploys
from the `tpo-portal` directory and reads the same Supabase project as the
SkillFul Android/student app.

## Local development

Copy `.env.example` to `.env` and provide the same `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` used by the student app. Then run:

```bash
npm install --prefix tpo-portal
npm run dev --prefix tpo-portal
```

The portal uses port 8081 so it can run beside the main app on port 8080.

## Vercel deployment

Create a second Vercel project from this repository and set its root directory
to `tpo-portal`. Use the Vite defaults (`npm run build`, output `dist`) and add
the two Supabase environment variables above. The included `vercel.json`
provides SPA rewrites and prevents search indexing.

## Database setup

Apply the SQL in this order:

1. The main app schema (`supabase_schema.sql`).
2. `supabase/institution_student_codes_migration.sql`.
3. `supabase/ai_practice_migration.sql`.
4. Deploy `supabase/functions/generate-practice`.

Create an institution and provision a TPO account from the Supabase SQL editor:

```sql
insert into public.institutions (name, city)
values ('Your College of Engineering', 'Pune')
returning id;

insert into public.institution_members (institution_id, user_id, role)
values ('<institution id>', '<TPO auth user id>', 'tpo');
```

TPO accounts are provisioned rather than self-registered. Never put the
Supabase service-role key in this frontend.

## Student enrolment

The portal generates opaque, one-time student codes. Only each code's SHA-256
digest is stored, so generated codes must be copied when they are displayed.
Each student:

1. Selects their college in the Android app.
2. Enters their personal code, degree and academic year.
3. Signs in (or submits the same information from Profile Settings).
4. Appears on the TPO roster after `claim_student_access_code` succeeds.

Shared institution codes and `?join=` links are retired. Existing roster rows
are preserved by the migration. A TPO can reset an individual student's access
from the roster; this removes that membership and returns a new one-time code.

## Readiness model

The generated `src/data/catalog.ts` mirrors the Android app's current fixed
student categories. Regenerate it after changing `src/data/studentQuestions.ts`:

```bash
node scripts/generate-tpo-catalog.mjs
```

Fixed categories score 65% on accuracy and 35% on coverage. Untouched fixed
topics score zero. Free-form AI practice is aggregated into one explicitly
labelled `ai_practice` technical category, using total correct answers and
total attempted questions. AI practice contributes when used but is optional,
so it does not cap students who complete only the fixed catalog, and it is
never incorrectly assigned to a hard-coded course topic.

Five readiness pillars are used:

- Aptitude & Reasoning — 20%
- Technical Fundamentals — 30%
- Communication — 20%
- Interview Craft — 20%
- Work Readiness — 10%

Wellbeing and safety categories are reported separately and do not change the
headline readiness score.

## Verification

```bash
npm test --prefix tpo-portal
npm run build --prefix tpo-portal
```

The dashboard reports backend/query failures as errors instead of silently
turning denied data into zero readiness. Sample cohorts are always labelled.
