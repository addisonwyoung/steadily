-- Learning step 1: profile storage and access rules.
-- Run once in the Supabase SQL Editor. This does not create accounts or profiles.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now(),

  -- Lowercase makes username uniqueness unambiguous: alex and Alex cannot coexist.
  constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,24}$')
);

alter table public.profiles enable row level security;

-- Explicit privileges avoid relying on the project's default table grants.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, username) on table public.profiles to authenticated;
grant update (username) on table public.profiles to authenticated;

create policy "Read your own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Create your own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Update your own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

commit;
