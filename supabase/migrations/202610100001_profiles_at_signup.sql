-- Apply after 202609230001_create_profiles.sql.
-- Signup creates both the Auth account and username profile atomically.
begin;

create or replace function public.steadily_create_signup_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_username text := pg_catalog.lower(pg_catalog.btrim(new.raw_user_meta_data ->> 'username'));
begin
  if chosen_username is null or chosen_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'A valid username is required during registration.' using errcode = '23514';
  end if;
  insert into public.profiles (id, username)
    values (new.id, chosen_username);
  -- The unique constraint rejects concurrent claims and rolls back signup too.
  return new;
end;
$$;
revoke all on function public.steadily_create_signup_profile() from public, anon, authenticated;

create trigger steadily_profile_after_signup
  after insert on auth.users
  for each row execute function public.steadily_create_signup_profile();

-- Recover profiles for earlier signups using their saved username metadata.
-- Never overwrite an existing profile. Earliest signup wins among old duplicates.
insert into public.profiles (id, username, created_at)
select candidates.id, candidates.username, candidates.created_at
from (
  select distinct on (pg_catalog.lower(pg_catalog.btrim(u.raw_user_meta_data ->> 'username')))
    u.id,
    pg_catalog.lower(pg_catalog.btrim(u.raw_user_meta_data ->> 'username')) as username,
    u.created_at
  from auth.users u
  where not exists (select 1 from public.profiles p where p.id = u.id)
    and pg_catalog.lower(pg_catalog.btrim(u.raw_user_meta_data ->> 'username')) ~ '^[a-z0-9_]{3,24}$'
  order by pg_catalog.lower(pg_catalog.btrim(u.raw_user_meta_data ->> 'username')), u.created_at, u.id
) candidates
on conflict do nothing;

-- Availability check returns only a boolean, never another user's profile.
create or replace function public.steadily_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    pg_catalog.lower(pg_catalog.btrim(candidate)) ~ '^[a-z0-9_]{3,24}$'
    and not exists (
      select 1 from public.profiles p
      where p.username = pg_catalog.lower(pg_catalog.btrim(candidate))
    ), false
  );
$$;
revoke all on function public.steadily_username_available(text) from public;
grant execute on function public.steadily_username_available(text) to anon, authenticated;

commit;
