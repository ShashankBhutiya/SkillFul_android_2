# Prompt: add Student / Professional mode to the Skillful website

Copy everything below the line into the session working on the website repo.

---

Add a **Student vs Professional mode** to this app. It was already built and shipped in the Android/Capacitor repo at `C:\Users\shash\Music\Skillful\SkillFul_android`; this task ports the same feature here so the two stay consistent.

**Before you write anything:** read that repo's implementation and reuse it wherever the code is shared. The files that matter are `src/config/userMode.ts`, `src/hooks/useUserMode.ts`, `src/components/UserModeSelect.tsx`, `src/components/UserModeOnboarding.tsx`, `src/data/studentQuestions.ts`, and the mode-related edits in `src/components/CategorySelect.tsx`, `src/components/AuthModal.tsx`, `src/components/ProfileSettingsModal.tsx`, `src/components/QuizGame.tsx`, `src/contexts/AuthContext.tsx`, and `src/pages/SkillsPage.tsx`. If this repo shares that React codebase, copy the files rather than rewriting them. If it does not, match the *behaviour* below and adapt to whatever this codebase actually uses — do not assume the file paths transfer.

## What the app is

Skillful is swipe-based judgment training: the user swipes True/False on short real-life scenario statements and gets an explanation for each. It is **not** a PYQ or exam-prep app — never frame it that way in any copy you write.

## The decisions (these are settled — do not re-litigate them)

1. **The mode filters the catalog, it does not reorder it.** A student must never see office-politics, salary-negotiation or dating topics; a working professional must never see campus topics.
2. **Progress and streaks stay global.** Never partition them by mode. Switching modes hides categories; it must never reset, clear or fork any progress. The hidden progress reappears when the user switches back — say so in the settings UI.
3. **The professional experience must look exactly as it does today.** This feature is not licence to redesign it. A professional-mode user should not be able to tell anything changed.
4. **"Student" means college / university (18–24)**, not school. No board exams, no JEE/NEET framing.
5. **Ask once on first open**, before the catalog ever renders — not only at signup.
6. **Guests may browse the catalog but must sign up before the first question.** The old free-preview-then-gate behaviour is gone.

## Work items

### 1. Mode config and state

Define `UserMode = "student" | "professional"` and a `CategoryAudience = UserMode | "both"`. Store the choice in `localStorage` under the key `user_mode` (keep this key identical to the Android app). Default to `professional` when nothing is stored.

Expose a hook returning `{ mode, ready, hasChosen, setMode }`:
- `ready` is false until localStorage has been read. **Consumers must render nothing until it is true**, or the catalog flashes the default mode for a frame before the stored one applies.
- `hasChosen` is false when the user has never picked, which is what triggers onboarding.
- Broadcast changes on a **custom window event**, not `storage`. `storage` only fires in *other* tabs, so it cannot sync components in the current one.

### 2. Tag every category with an audience

Add an `audience` field to the category type and to whatever data file drives the catalog. Existing categories are `professional`. Treat a missing value as `professional`, since the original catalog was written entirely for working professionals.

Filter the rendered catalog with it. Keep lookups **by id** against the *full* list so a deep link for the other mode still resolves — only the browsable catalog is filtered.

### 3. Student catalog — 9 categories, 25 scenarios each

Copy `src/data/studentQuestions.ts` from the Android repo verbatim (225 scenarios, already written and reviewed). Categories and their section placement:

| Category | Section |
|---|---|
| Placements & Campus Interviews | Studies & Career |
| Internships & First Job | Studies & Career |
| Study Skills & Exam Strategy | Studies & Career |
| Public Speaking & Presentations | Studies & Career |
| Money for Students | Campus & Life |
| Campus Friendships & Peer Pressure | Campus & Life |
| Mental Health & Burnout | Campus & Life |
| Digital Safety & Online Reputation | Campus & Life |
| Student Scams & Fake Opportunities | Campus & Life |

The existing catalog splits into two sections by a `type` field of `"Professional" | "Personal"`. Reuse that field for the student split — `Professional` → Studies & Career, `Personal` → Campus & Life. **Check this mapping renders correctly**; getting it wrong puts "Study Skills" under Campus & Life and "Money for Students" under Studies & Career, which is the mistake I made first time.

Section headings are per-mode:
- Student: **Studies & Career** ("Placements, internships, exams") and **Campus & Life** ("Money, friendships, wellbeing")
- Professional: **Professional** ("Career & workplace") and **Personal** ("Life & relationships") — unchanged

Anything else derived from the catalog must respect the filter too — in the Android app that meant "Skill of the day", which otherwise offers a student a salary-negotiation topic.

### 4. First-run onboarding

A full-screen step shown when `hasChosen` is false: a welcome heading, the two mode cards with descriptions, and a Continue button disabled until one is picked.

Render it **above the route's own logic**, so a deep link to a specific category on a fresh install asks first and *then* continues to that category. Do not drop a first-run user straight into the wrong mode's catalog.

### 5. Signup step

Add the same picker to the signup form, **pre-filled from any choice already made during onboarding**, so nobody answers the question twice. Require it before the account can be created.

If there is a Google/OAuth signup path, write the choice to localStorage **before** triggering the redirect — OAuth navigates away and any component state is lost. localStorage survives it.

### 6. Settings switch

Add the picker to profile settings using the same wording as signup, so a user recognises the question they answered when they joined. Apply the switch **immediately rather than on Save** — nothing about it is destructive. Include a line telling the user their progress and streak are kept for both modes.

### 7. Persist to the account

Add a `user_mode` column to the `profiles` table (`text`, constrained to `'student' | 'professional'`, nullable — null means never chosen). The Android repo has a ready migration at `supabase/user_mode_migration.sql`, including a trigger to carry the value from signup metadata into the profile row. **Verify that trigger against the existing `handle_new_user()` definition before running it** — I could not see that function and the migration may need adapting.

Write the mode on signup and on every switch. On login, the **account is the source of truth**: if the loaded profile has a mode, apply it over whatever this device had stored, so a user signing in on a new device gets the mode they chose.

The whole feature must keep working with no database column and no network — the local switch stands and re-syncs later. Never block the UI on the profile write.

### 8. Move the login gate to before the first question

Guests browse the catalog freely; the gate appears **before question one** instead of after a preview.

Three things I had to fix here, so check them explicitly:
- The gate overlay only covered the card area, leaving the bottom answer/skip buttons reachable. **Guard every answer/skip handler and disable those buttons while the gate is up.**
- The question card rendered *behind* the modal, so a guest could read scenarios without an account. **Suppress the cards while the gate is up.**
- Since the gate is now the entry barrier, a guest who taps a category would otherwise be trapped. **Add a "Back to skills" escape.**
- Signing in must resume the current question, not skip it — there is nothing to advance past now that the gate precedes the first answer.

Also grep the whole codebase for copy that promises guests can play — e.g. "Guests can play instantly, but progress isn't saved" — and rewrite it. That claim is now false.

## Verify before reporting done

Run the app and confirm each of these — do not ask the user to check manually:

- Fresh state → onboarding appears
- Pick Student → 9 student categories only, correct section headings, no professional topics anywhere
- Reload → goes straight to the catalog, does not ask again
- Fresh state → deep link to a category → asks first, then continues to that category
- Pick Working professional → **the original category list, byte-for-byte what it was before this change**
- Switch modes in settings → catalog swaps, progress and streak survive
- As a guest, tap a category → gate appears before any question, no scenario text visible behind it, answer/skip buttons inert, "Back to skills" works

Then run the typecheck, the test suite, and a production build.

## Note on pre-existing issues

If you hit a force-update modal blocking the app locally, or `renotify` type errors in the notification services, those are pre-existing and unrelated — do not fix them as part of this task, but mention them in your summary.
