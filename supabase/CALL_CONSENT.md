# Call consent rollout

Apply `migrations/20260908100000_call_consent.sql` before releasing the updated web or Android client. This migration is additive; no existing account is opted in. It does not deploy a calling provider or place calls.

Email signup consent is captured by an `auth.users` INSERT trigger even when email confirmation prevents a client profile update. Google users choose call preferences in Profile Settings after signing in. Changes to auth metadata later cannot re-enable withdrawn consent.

`call_consents` contains current permission and the phone number it covers. `call_consent_events` records server timestamps, wording, version, source, grants and withdrawals. Users can only read their own rows; updates go through `set_call_consent`. Consent records are deleted with the auth account. No client-supplied timestamps are accepted. Keep the SQL audit wording/version aligned with `src/config/callConsent.ts` on future changes.

Before any outreach, check the current record (not a previous export or signup metadata). Confirm the phone belongs to the user; consent alone is not number verification. The existing development OTP simulator must not be treated as proof of ownership. Use your approved telecom workflow; this checkbox alone does not complete commercial-calling registration requirements.

For an authorized operator receiving a withdrawal by phone or email, run this parameterized update using a trusted server/admin connection:

```sql
update public.call_consents
set enabled = false, source = 'operator'
where user_id = :user_id;
```

The audit trigger records the withdrawal. Do not manually set `enabled = true` on behalf of users. Historical consent does not override the current disabled state.

Database checks are in `tests/call_consent.sql`. Run against a test database after the migration; the script uses a transaction and rolls its fixtures back.
