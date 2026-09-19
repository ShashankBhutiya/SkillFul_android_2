-- 1-Month Free Premium Trial for all accounts.
-- New signups automatically receive 30 days of trialing premium access.
-- Existing non-paying accounts receive 30 days starting from rollout date (Option A).

alter table public.profiles
  alter column subscription_status set default 'trialing';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_referrer text;
  valid_referrer text;
begin
  requested_referrer := nullif(new.raw_user_meta_data ->> 'referred_by_code', '');

  if requested_referrer is not null
     and exists (select 1 from public.profiles where referral_code = requested_referrer) then
    valid_referrer := requested_referrer;
  end if;

  insert into public.profiles (
    id,
    email,
    referral_code,
    referred_by_code,
    phone,
    phone_consent,
    email_consent,
    whatsapp_consent,
    phone_verified,
    first_name,
    last_name,
    user_mode,
    subscription_status,
    subscription_period_end
  ) values (
    new.id,
    new.email,
    public.generate_referral_code(),
    valid_referrer,
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'phone_consent')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'email_consent')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'whatsapp_consent')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'phone_verified')::boolean, false),
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'given_name'),
    coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data ->> 'family_name'),
    case
      when new.raw_user_meta_data ->> 'user_mode' in ('student', 'professional')
        then new.raw_user_meta_data ->> 'user_mode'
      else null
    end,
    'trialing',
    now() + interval '30 days'
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = coalesce(public.profiles.phone, excluded.phone),
    first_name = coalesce(public.profiles.first_name, excluded.first_name),
    last_name = coalesce(public.profiles.last_name, excluded.last_name),
    user_mode = coalesce(public.profiles.user_mode, excluded.user_mode);

  return new;
end;
$$;

-- Option A: Grant 30-day trial to all existing non-paying or inactive accounts
update public.profiles
set
  subscription_status = 'trialing',
  subscription_period_end = now() + interval '30 days'
where subscription_status is null
   or subscription_status = 'inactive'
   or (subscription_status = 'trialing' and subscription_period_end is null);
