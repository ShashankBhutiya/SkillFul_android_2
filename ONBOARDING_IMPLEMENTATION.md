# Skillful onboarding

Implemented from Figma file `sjPYtVfjU27D8dBi5dp3bU`:

- `/onboarding`: welcome, role selection, student/professional details, signup/login, completion.
- `/profile` and `/info`: profile and settings, profile editing, password changes, notification preferences, support and existing membership/practice links.
- First-time guests enter onboarding from `/`; the skills catalog redirects guests without a selected role to this route.
- Returning users retain their existing account, college linking, theme and practice functionality.

The Figma illustrations, logo exports and SVG icons are stored in `public/onboarding`. Styles are scoped to these screens in `src/components/onboarding/onboarding.css`.

## Persistence

Role, first/last name, degree and academic year use the existing Supabase `profiles` fields. The complete student/professional detail record is stored in the authenticated user's `user_metadata.onboarding`; no database migration is needed. Profile settings can edit the additional fields.

A local draft survives Google redirects and email verification. Email/password drafts are only applied to the matching authenticated email. Completion is displayed after authenticated profile saving succeeds; failures preserve the draft for retry. Free-text college details do not grant institution membership; verified college linking continues to use the existing student-code flow.

## Run and verify

```sh
npm ci
npm run dev
npm test
npm run build
npx cap sync android
```

Preview: `http://localhost:8080/onboarding` and `http://localhost:8080/profile`.

`src/test/onboardingFlow.test.tsx` covers role branching, email confirmation, pending draft recovery, account isolation, failed save retries and Google errors. The Vitest workers disable host web storage when supported, allowing jsdom browser storage to work on Node 26.

For optional browser verification, launch a disposable headless Chrome with a workspace-local user-data directory and `--remote-debugging-port=9222`, start Vite on port 8080, then run `node scripts/verify-onboarding.mjs`. This script intercepts all Supabase backend endpoints with local fixtures; it does not create accounts or modify the real backend. It checks all seven screens, student/professional saving, profile editing, password changes, notification preferences, image loading and responsive overflow, and saves screenshots under the ignored `.preview/screenshots` directory.

The Android web assets have been synced. An APK/AAB has not been built or published.
