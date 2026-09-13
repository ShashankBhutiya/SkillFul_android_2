# AI generation limits

Apply migrations through `20260913010000_restore_five_question_generation.sql` before deploying the updated `generate-practice` Edge Function. The function fails closed if quota reservation is unavailable.

Each signed-in user has a 60-second cooldown and 40 questions per UTC day by default. Every active saved streak day adds 10 daily questions: `min(300, base + 10 * current_streak)`. With the default base this gives 50 at day 1, 60 at day 2, 110 at day 7, and 290 at day 25, reaching the 300 cap at day 26. The quota resets at 00:00 UTC (5:30 AM IST).

The Edge Function reads `user_streaks` for the authenticated user; generation requests cannot supply their own streak or quota. Saved dates are evaluated in IST. Today's or yesterday's streak qualifies; older streaks qualify only if existing banked freezes cover the missed days (maximum three), matching the app's freeze rules. Expired or future-dated streaks receive no bonus. Missing streak records or an absent optional streak table use the base quota. This relies on the app's existing client-synced streak data, not independently verified activity records.

Set the Edge Function secret `AI_DAILY_GENERATION_LIMIT` to an integer from 40 to 300 to override the base. Old values such as 20 and invalid values now fall back to 40. Bonuses are added to the base, with a hard cap of 300 questions. The form describes the default daily bonus; quota-exhaustion errors report the actual effective limit. Each streak increase applies on the next generation request without resetting attempts already used that day. Unused questions do not accumulate across days.

Validated requests reserve quota atomically before calling the AI provider. Each request generates five questions and consumes five questions of quota. The reservation RPC still counts sets, so the Edge Function passes floor(question quota / 5); leftover quota below five cannot fund another set. The database enforces a maximum of 60 sets (300 questions) and defaults to eight sets (40 questions). Existing usage remains in sets and needs no conversion. Failed provider calls or saves still consume an attempt. Invalid input and requests rejected by the limiter do not consume quota. Saved practice sets do not consume quota. Existing sets created today seed usage on the user's first reservation after migration.

HTTP 429 responses include a readable error, a `code` (`cooldown` or `daily_quota`), `retryAfter` seconds in JSON, and a `Retry-After` header.

Run `tests/ai_generation_limits.sql` against a migrated local/test PostgreSQL database as postgres to check reservation, cooldown, daily exhaustion, rollover, and client permissions. Fixtures are rolled back. The locking also serializes reservations for the same user across concurrent Edge Function instances.

`npm test` includes daily streak bonuses, expiry, freeze coverage, IST rollover, invalid configuration, and quota cap checks.

