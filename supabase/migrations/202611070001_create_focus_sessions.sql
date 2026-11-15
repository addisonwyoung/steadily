-- Apply after habit_templates. Sessions outlive deselection of a habit.
begin;

create table public.focus_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id text not null references public.habit_templates(id),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds between 60 and 10800),
  created_at timestamptz not null default now(),
  constraint focus_session_elapsed_time check (
    completed_at >= started_at + duration_seconds * interval '1 second'
  )
);

create index focus_sessions_user_completed_idx
  on public.focus_sessions (user_id, completed_at desc, id);

alter table public.focus_sessions enable row level security;
revoke all on public.focus_sessions from anon, authenticated;
-- Sessions are immutable. Retries use INSERT ON CONFLICT DO NOTHING, never UPDATE.
grant select, insert on public.focus_sessions to authenticated;

create policy "Users can read their focus sessions"
  on public.focus_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can record their focus sessions"
  on public.focus_sessions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and completed_at <= now() + interval '5 minutes'
  );

commit;
