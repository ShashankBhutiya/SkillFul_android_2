# AI generation limits

Apply migrations through `20260916020000_ten_question_generation.sql` before deploying the updated `generate-practice` Edge Function. The function fails closed if quota reservation is unavailable.

Each signed-in user has a 60-second cooldown and 100 questions per UTC day by default. Every active saved streak day adds 10 daily questions: `min(1000, base + 10 * current_streak)`. With the default base this gives 110 at day 1, 170 at day 7, and reaches the 1,000-question cap at day 90. The quota resets at 00:00 UTC (5:30 AM IST).

The Edge Function reads `user_streaks` for the authenticated user; generation requests cannot supply their own streak or quota. Saved dates are evaluated in IST. Today's or yesterday's streak qualifies; older streaks qualify only if existing banked freezes cover the missed days (maximum three), matching the app's freeze rules. Expired or future-dated streaks receive no bonus. Missing streak records or an absent optional streak table use the base quota. This relies on the app's existing client-synced streak data, not independently verified activity records.

Set the Edge Function secret `AI_DAILY_GENERATION_LIMIT` to an integer from 100 to 1,000 to override the base. Values below 100 or invalid values fall back to 100. Bonuses are added to the base, with a hard cap of 1,000 questions. The form describes the default daily bonus; quota-exhaustion errors report the actual effective limit. Each streak increase applies on the next generation request without resetting attempts already used that day. Unused questions do not accumulate across days.

Validated requests reserve quota atomically before calling the AI provider. Each request generates ten questions and consumes ten questions of quota. The reservation RPC still counts sets, so the Edge Function passes floor(question quota / 10); leftover quota below ten cannot fund another set. The database enforces a maximum of 100 sets (1,000 questions) and defaults to ten sets (100 questions). Existing usage remains in sets and needs no conversion. Failed provider calls or saves still consume an attempt. Invalid input and requests rejected by the limiter do not consume quota. Saved practice sets do not consume quota. Existing sets created today seed usage on the user's first reservation after migration.

HTTP 429 responses include a readable error, a `code` (`cooldown` or `daily_quota`), `retryAfter` seconds in JSON, and a `Retry-After` header.

Run `tests/ai_generation_limits.sql` against a migrated local/test PostgreSQL database as postgres to check reservation, cooldown, daily exhaustion, rollover, and client permissions. Fixtures are rolled back. The locking also serializes reservations for the same user across concurrent Edge Function instances.

`npm test` includes daily streak bonuses, expiry, freeze coverage, IST rollover, invalid configuration, and quota cap checks.

