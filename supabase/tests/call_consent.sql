-- Run on a test database after the migration. All fixtures are rolled back.
begin;
do $$
declare
  opted uuid := gen_random_uuid();
  other_user uuid := gen_random_uuid();
  before_events bigint;
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    (opted, opted::text || '@example.invalid', '{"phone":"+919876543210","call_consent":true,"call_consent_phone":"+919876543210","call_consent_version":"2026-09-08-v1"}'),
    (other_user, other_user::text || '@example.invalid', '{"phone":"+919876543211","whatsapp_consent":true}');
  if not exists (select 1 from public.call_consents where user_id = opted and enabled and source = 'signup') then
    raise exception 'Signup permission was not captured';
  end if;
  if exists (select 1 from public.call_consents where user_id = other_user and enabled) then
    raise exception 'Another channel granted call permission';
  end if;
  if not exists (select 1 from public.call_consent_events where user_id = opted and recorded_at is not null and consent_text like 'I agree%') then
    raise exception 'Missing audit evidence';
  end if;

  perform set_config('request.jwt.claim.sub', opted::text, true);
  select count(*) into before_events from public.call_consent_events where user_id = opted;
  perform public.set_call_consent(true, '+91 (98765) 43210', '2026-09-08-v1');
  if (select count(*) from public.call_consent_events where user_id = opted) <> before_events then
    raise exception 'Retry duplicated the consent event';
  end if;
  perform public.set_call_consent(false, null, null);
  if exists (select 1 from public.call_consents where user_id = opted and enabled) then
    raise exception 'Withdrawal failed';
  end if;
  update auth.users set raw_user_meta_data = raw_user_meta_data || '{"call_consent":true}' where id = opted;
  if exists (select 1 from public.call_consents where user_id = opted and enabled) then
    raise exception 'Auth metadata re-enabled withdrawn consent';
  end if;
  perform public.set_call_consent(true, '+919876543210', '2026-09-08-v1');
  update public.profiles set phone = '+919876543212' where id = opted;
  if not exists (select 1 from public.call_consents where user_id = opted and not enabled and source = 'phone_changed') then
    raise exception 'Phone change did not withdraw consent';
  end if;
  begin
    perform public.set_call_consent(true, '+919876543210', '2026-09-08-v1');
    raise exception 'Wrong phone was accepted';
  exception when raise_exception then
    if sqlerrm <> 'Save this phone number to your profile first' then raise; end if;
  end;

  -- Act as another authenticated user to verify isolation and write denial.
  perform set_config('request.jwt.claim.sub', other_user::text, true);
  set local role authenticated;
  if exists (select 1 from public.call_consents where user_id = opted)
     or exists (select 1 from public.call_consent_events where user_id = opted) then
    raise exception 'Consent records exposed to another user';
  end if;
  begin
    update public.call_consents set enabled = true where user_id = other_user;
    raise exception 'Direct client consent mutation was accepted';
  exception when insufficient_privilege then null;
  end;
  reset role;
end;
$$;
rollback;
