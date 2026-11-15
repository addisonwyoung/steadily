begin;
create table public.habit_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id text not null references public.habit_templates(id),
  day date not null,
  completed boolean not null default true,
  primary key (user_id, habit_id, day)
);
alter table public.habit_completions enable row level security;
revoke all on public.habit_completions from anon, authenticated;
grant select, insert, update on public.habit_completions to authenticated;
create policy "Read own completions" on public.habit_completions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own completions" on public.habit_completions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own completions" on public.habit_completions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Undo keeps a false row, preventing another browser's legacy import from resurrecting it.
commit;
