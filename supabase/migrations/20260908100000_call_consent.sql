-- Explicit voice-call permission. Existing accounts remain opted out.
-- Deploy before releasing the client. Signup capture runs without an auth
-- session, including when email confirmation is required.
begin;

create table public.call_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  phone text,
  consent_version text not null,
  source text not null check (source in ('signup', 'profile_settings', 'phone_changed', 'operator')),
  updated_at timestamptz not null default now(),
  check (not enabled or (phone is not null and phone ~ '^\+[1-9][0-9]{7,14}$'))
);

create table public.call_consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null,
  phone text,
  consent_version text not null,
  consent_text text not null,
  source text not null,
  recorded_at timestamptz not null default now()
);
create index call_consent_events_user_time on public.call_consent_events (user_id, recorded_at desc);

alter table public.call_consents enable row level security;
alter table public.call_consent_events enable row level security;
revoke all on public.call_consents, public.call_consent_events from public, anon, authenticated, service_role;
grant select on public.call_consents, public.call_consent_events to authenticated;
grant select, insert, update, delete on public.call_consents to service_role;
grant select on public.call_consent_events to service_role;
create policy "Read own call preference" on public.call_consents for select to authenticated using (user_id = auth.uid());
create policy "Read own call consent history" on public.call_consent_events for select to authenticated using (user_id = auth.uid());

create function public.stamp_call_consent() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'Cannot change consent owner';
    end if;
    if new.enabled = old.enabled and new.phone is not distinct from old.phone
       and new.consent_version = old.consent_version then
      return null; -- Retries / saving unrelated settings are not new consent.
    end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger stamp_call_consent before insert or update on public.call_consents
  for each row execute function public.stamp_call_consent();

create function public.audit_call_consent() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.call_consent_events (user_id, enabled, phone, consent_version, consent_text, source, recorded_at)
  values (new.user_id, new.enabled, new.phone, new.consent_version,
    'I agree to receive occasional phone calls from Skillful about my learning progress, product updates, or support. I can withdraw this consent anytime.',
    new.source, new.updated_at);
  return new;
end;
$$;
create trigger audit_call_consent after insert or update on public.call_consents
  for each row execute function public.audit_call_consent();

create function public.set_call_consent(p_enabled boolean, p_phone text, p_version text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  normalized_phone text := regexp_replace(coalesce(p_phone, ''), '[[:space:]()-]', '', 'g');
  profile_phone text;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if p_enabled is null then raise exception 'Consent choice required'; end if;
  -- Lock profile first so a concurrent phone edit cannot retain old consent.
  select regexp_replace(coalesce(phone, ''), '[[:space:]()-]', '', 'g') into profile_phone
    from public.profiles where id = caller for update;
  if p_enabled then
    if p_version is distinct from '2026-09-08-v1' then raise exception 'Unsupported consent version'; end if;
    if normalized_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'International phone number required'; end if;
    if normalized_phone is distinct from profile_phone then raise exception 'Save this phone number to your profile first'; end if;
  end if;
  -- Withdrawal remains possible without a phone or the latest consent version.
  if not p_enabled then
    update public.call_consents set enabled = false, source = 'profile_settings' where user_id = caller;
    return;
  end if;
  insert into public.call_consents (user_id, enabled, phone, consent_version, source)
    values (caller, true, normalized_phone, p_version, 'profile_settings')
    on conflict (user_id) do update set enabled = true, phone = excluded.phone,
      consent_version = excluded.consent_version, source = excluded.source;
end;
$$;
revoke all on function public.set_call_consent(boolean, text, text) from public, anon;
grant execute on function public.set_call_consent(boolean, text, text) to authenticated;

create function public.capture_signup_call_consent() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  signup_phone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[[:space:]()-]', '', 'g');
begin
  if new.raw_user_meta_data -> 'call_consent' = 'true'::jsonb
     and new.raw_user_meta_data ->> 'call_consent_version' = '2026-09-08-v1'
     and new.raw_user_meta_data ->> 'call_consent_phone' = signup_phone
     and signup_phone ~ '^\+[1-9][0-9]{7,14}$' then
    insert into public.call_consents (user_id, enabled, phone, consent_version, source)
      values (new.id, true, signup_phone, '2026-09-08-v1', 'signup');
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created_call_consent after insert on auth.users
  for each row execute function public.capture_signup_call_consent();

create function public.revoke_calls_on_phone_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if regexp_replace(coalesce(new.phone, ''), '[[:space:]()-]', '', 'g')
     is distinct from regexp_replace(coalesce(old.phone, ''), '[[:space:]()-]', '', 'g') then
    update public.call_consents set enabled = false, source = 'phone_changed'
      where user_id = new.id and enabled
        and phone is distinct from regexp_replace(coalesce(new.phone, ''), '[[:space:]()-]', '', 'g');
  end if;
  return new;
end;
$$;
create trigger revoke_calls_on_phone_change after update of phone on public.profiles
  for each row execute function public.revoke_calls_on_phone_change();

revoke all on function public.stamp_call_consent(), public.audit_call_consent(),
  public.capture_signup_call_consent(), public.revoke_calls_on_phone_change() from public, anon, authenticated;

commit;
