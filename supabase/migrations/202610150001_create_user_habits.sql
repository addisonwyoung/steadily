-- Apply after 202610140001_create_habit_templates.sql.
-- Stores each account's selections; habit descriptions live in habit_templates.
-- The 2–5 selection limit is not enforced by this migration.
begin;

create table public.user_habits (
  user_id uuid not null
    references auth.users(id) on delete cascade,
  habit_id text not null
    references public.habit_templates(id),
  created_at timestamptz not null default now(),
  primary key (user_id, habit_id)
);

alter table public.user_habits
  enable row level security;

revoke all on public.user_habits from anon, authenticated;

grant select, insert, delete
  on public.user_habits to authenticated;

create policy "Users can read their own habits"
  on public.user_habits
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can select their own habits"
  on public.user_habits
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own habits"
  on public.user_habits
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

commit;
