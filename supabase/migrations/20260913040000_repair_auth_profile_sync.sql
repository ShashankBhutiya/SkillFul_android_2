-- Keep public.profiles in sync with auth.users.
--
-- The previous signup trigger swallowed every error, which let auth account
-- creation succeed without a corresponding profile.  A profile is application
-- data required by the app, so failures must be visible to the signup request
-- instead of silently creating an incomplete account.

alter table public.profiles
  add column if not exists user_mode text
  check (user_mode in ('student', 'professional'));

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
    user_mode
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
    end
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Repair accounts created while the old trigger was silently failing.
insert into public.profiles (
  id,
  email,
  referral_code,
  phone,
  phone_consent,
  email_consent,
  whatsapp_consent,
  phone_verified,
  first_name,
  last_name,
  user_mode
)
select
  u.id,
  u.email,
  public.generate_referral_code(),
  u.raw_user_meta_data ->> 'phone',
  coalesce((u.raw_user_meta_data ->> 'phone_consent')::boolean, false),
  coalesce((u.raw_user_meta_data ->> 'email_consent')::boolean, false),
  coalesce((u.raw_user_meta_data ->> 'whatsapp_consent')::boolean, false),
  coalesce((u.raw_user_meta_data ->> 'phone_verified')::boolean, false),
  coalesce(u.raw_user_meta_data ->> 'first_name', u.raw_user_meta_data ->> 'given_name'),
  coalesce(u.raw_user_meta_data ->> 'last_name', u.raw_user_meta_data ->> 'family_name'),
  case
    when u.raw_user_meta_data ->> 'user_mode' in ('student', 'professional')
      then u.raw_user_meta_data ->> 'user_mode'
    else null
  end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
