-- Student / Professional mode.
--
-- The app writes this at signup and whenever the user switches modes from
-- Profile Settings. It only decides which slice of the skill catalog is shown;
-- progress and streaks are global and are deliberately not partitioned by mode.

alter table public.profiles
  add column if not exists user_mode text
  check (user_mode in ('student', 'professional'));

comment on column public.profiles.user_mode is
  'Which catalog the user sees: student or professional. Null means never chosen.';

-- Carry the signup metadata through to the profile row.
-- Adjust to match your existing handle_new_user() definition if it differs.
create or replace function public.handle_new_user_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'user_mode'
     and new.raw_user_meta_data ->> 'user_mode' in ('student', 'professional') then
    update public.profiles
      set user_mode = new.raw_user_meta_data ->> 'user_mode'
      where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_set_mode on auth.users;
create trigger on_auth_user_created_set_mode
  after insert on auth.users
  for each row execute function public.handle_new_user_mode();
