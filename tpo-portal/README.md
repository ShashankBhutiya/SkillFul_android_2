# SkillFul for Institutions — TPO Dashboard

Placement readiness dashboard for Training & Placement Officers.

This is a **separate website** from the SkillFul student app. It is its own Vite
app with its own `package.json`, builds independently, and deploys to its own
Vercel project on its own domain. Nothing in the student app links to it and no
route in the student app serves it — a TPO reaches it only at this site's URL.

It reads the same Supabase project the app writes to. There is no second
backend.

---

## Deploying to Vercel

The repo holds two sites. Vercel needs a **second project** pointed at this
subdirectory — creating it is what gives the dashboard its own link.

1. Vercel dashboard → **Add New… → Project** → import the same Git repository.
2. **Root Directory**: set to `tpo-portal`. This is the setting that separates
   the two deployments; leave it at the repo root and Vercel will build the
   student app instead.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`,
   output directory `dist` — both defaults.
4. **Environment variables** — add both, for Production, Preview and Development:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | same as the student app |
   | `VITE_SUPABASE_ANON_KEY` | same as the student app |

   The anon key is safe to ship: row-level security restricts a TPO to their own
   institution's roster. Never put the service-role key here.
5. Deploy. Assign a domain — something like `institutions.yourdomain.com` or
   `tpo.yourdomain.com`. **That domain is the link you give to placement
   officers.**

`vercel.json` already handles SPA rewrites and sends `X-Robots-Tag: noindex`, so
the dashboard stays out of search results.

## Running locally

```bash
npm install --prefix tpo-portal
```

Copy `.env.example` to `.env`, fill in the same Supabase credentials, then:

```bash
npm run dev --prefix tpo-portal
```

Serves on <http://localhost:8081>, so it can run alongside the student app on
8080.

## Granting a TPO access

The `institutions` and `institution_members` tables come from the
`20260825020012_tpo_dashboard` migration in the app repo, which is already
applied.

A TPO account is provisioned, not self-registered — the sign-in screen has no
sign-up on purpose, since an account without a `tpo` membership row would see
nothing.

For a demo pair (one TPO, one premium student), create the two auth users under
**Authentication → Users → Add user** with *Auto Confirm User* ticked, then set
their emails at the top of `supabase/demo_accounts.sql` in the app repo and run
it — it is idempotent and has a teardown block at the bottom.

To wire up a real college by hand instead, in the Supabase SQL editor:

```sql
-- 1. Create the institution. The code is what students enter to join.
insert into public.institutions (name, code, city)
values ('Your College of Engineering', 'YCE2026', 'Pune')
returning id;

-- 2. Make an existing auth user its TPO. Get the uid from Authentication → Users.
insert into public.institution_members (institution_id, user_id, role)
values ('<institution id from step 1>', '<TPO auth uid>', 'tpo');
```

## How students join

Students are never inserted by hand. They enrol themselves with the join code,
which the dashboard shows in its **Add students to this cohort** panel — as a
bare code to read out or print, and as a link for WhatsApp groups.

```
TPO shares  https://skillfulglobal.com/skills?join=YCE2026
                        ↓
app captures ?join= into localStorage (same mechanism as ?ref= referrals)
                        ↓
after sign-in, the app calls  join_institution('YCE2026')
                        ↓
row appears in institution_members → student shows up on this dashboard
```

Students already using the app can instead type the code under
**Profile → Your college**, which also collects roll number and branch — the
roster displays and filters on those, and a code alone leaves them blank.

Enrolment goes through the `join_institution` RPC rather than a direct insert.
That matters for two reasons: students cannot read the `institutions` table
(so they could not resolve a code themselves), and a direct insert policy would
let anyone who learned an institution's UUID add themselves to that college's
roster. The RPC resolves the code server-side, so the client never handles an
institution id. A student belongs to one college — joining a different one
moves them rather than leaving them on two rosters.

Set `VITE_APP_URL` in the portal's environment if the student app is not on
`https://skillfulglobal.com`; the invite link is built from it.

Until an institution exists, the dashboard renders a **sample cohort behind an
explicit banner** naming the reason. That is for evaluating the layout — it is
never real student data, and the banner says so.

## Keeping the catalog in sync

`src/data/catalog.ts` is generated. It carries each student category's id, name,
emoji and question count — not the question text, which the dashboard never
renders and which would add ~340 kB to the bundle.

After adding or renaming a student category in the app, regenerate it from the
repo root:

```bash
node scripts/generate-tpo-catalog.mjs
```

## How readiness is scored

Each topic scores 65% on the student's best accuracy and 35% on coverage, where
40 questions counts as full coverage. Topic scores average into five pillars —
Aptitude (20%), Technical (30%), Communication (20%), Interview Craft (20%),
Work Readiness (10%) — which weight into the headline number.

A topic a student has never opened scores **zero rather than being skipped**.
Averaging untouched topics away would flatter the batch; to a placement cell an
untouched DBMS section is a gap, not a blank.

Wellbeing topics are tracked separately and deliberately excluded from the
score. Scoring lives in `src/readiness.ts` as pure functions, covered by
`src/test/readiness.test.ts` — run with `npm test --prefix tpo-portal`.

## Known gap: daily check-ins

`user_streaks` does not currently exist in the production database, so streaks
and last-active dates cannot be read. The dashboard shows those as **unknown**
rather than zero, and displays a banner explaining why — reporting "0% active"
when the source table is unreadable would be false. Readiness scores are
unaffected; they come from `user_progress` and `leaderboard_scores`.

Creating the `user_streaks` table (it is defined in `supabase_schema.sql`) makes
the engagement columns populate with no change to this site.
