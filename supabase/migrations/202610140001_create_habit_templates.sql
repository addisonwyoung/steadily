begin;

create table public.habit_templates (
  id text primary key,
  title text not null,
  task text not null,
  suggested_time text not null default 'Anytime'
    check (suggested_time in ('Morning', 'Afternoon', 'Evening', 'Anytime'))
);

insert into public.habit_templates
  (id, title, task, suggested_time)
values
  ('walk', 'Take a walk',
   'Walk for 15 minutes', 'Morning'),

  ('stretch', 'Stretch break',
   'Stretch for 5 minutes', 'Anytime'),

  ('water', 'Drink water',
   'Have a glass of water with breakfast', 'Morning'),

  ('fruit', 'Eat some fruit',
   'Add a piece of fruit to a meal', 'Anytime'),

  ('vegetables', 'Add vegetables',
   'Include vegetables with a meal', 'Evening'),

  ('outside', 'Get outside',
   'Spend 10 minutes outdoors', 'Afternoon'),

  ('movement-break', 'Take a movement break',
   'Step away from my desk and move around', 'Afternoon'),

  ('breathe', 'Pause and breathe',
   'Spend 2 minutes breathing comfortably', 'Anytime'),

  ('wind-down', 'Wind down',
   'Put my phone away 30 minutes before bed', 'Evening'),

  ('bedtime', 'Consistent bedtime',
   'Start my bedtime routine at my chosen time', 'Evening'),

  ('read', 'Read a few pages',
   'Read for 10 minutes', 'Morning'),

  ('focus', 'Make room to focus',
   'Study for 25 minutes', 'Morning'),

  ('screen-free-morning', 'A screen-free morning',
   'Wait 20 minutes before social media', 'Morning'),

  ('screen-free-meal', 'Screen-free meal',
   'Eat one meal without my phone', 'Anytime'),

  ('reflection', 'Write a reflection',
   'Write a few sentences about my day', 'Evening'),

  ('appreciation', 'Notice something good',
   'Write down one thing I appreciated today', 'Evening'),

  ('connect', 'Connect with someone',
   'Call or message someone I care about', 'Anytime'),

  ('create', 'Make room to create',
   'Spend 10 minutes on a creative hobby', 'Anytime'),

  ('tidy', 'Clear my space',
   'Tidy one surface for 5 minutes', 'Evening'),

  ('plan', 'Plan tomorrow',
   'Write down my main task for tomorrow', 'Evening');

   alter table public.habit_templates
  enable row level security;

revoke all on public.habit_templates from anon, authenticated;

grant select on public.habit_templates to authenticated;

create policy "Signed-in users can read habit templates"
  on public.habit_templates
  for select
  to authenticated
  using (true);

commit;