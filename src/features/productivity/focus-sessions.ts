import { z } from 'zod';
import { localDay, recentDays } from '../../domain/dates';

export const focusSessionSchema = z
  .object({
    id: z.uuid(),
    habitId: z.string().min(1),
    startedAt: z.iso.datetime(),
    completedAt: z.iso.datetime(),
    durationSeconds: z.number().int().min(60).max(10800),
  })
  .refine(
    (value) =>
      Date.parse(value.completedAt) - Date.parse(value.startedAt) >= value.durationSeconds * 1000,
    'A completed session must include its full focus duration.',
  );
export type FocusSession = z.infer<typeof focusSessionSchema>;
export type SavedFocusSession = FocusSession & { habitTitle: string };
const rowSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  habit_id: z.string().min(1),
  started_at: z.iso.datetime({ offset: true }),
  completed_at: z.iso.datetime({ offset: true }),
  duration_seconds: z.number().int(),
  habit_templates: z.object({ title: z.string().min(1) }),
});
const columns =
  'id, user_id, habit_id, started_at, completed_at, duration_seconds, habit_templates(title)';
function convert(row: unknown, userId: string): SavedFocusSession {
  const value = rowSchema.parse(row);
  if (value.user_id !== userId) throw new Error('This session belongs to a different account.');
  return {
    ...focusSessionSchema.parse({
      id: value.id,
      habitId: value.habit_id,
      startedAt: new Date(value.started_at).toISOString(),
      completedAt: new Date(value.completed_at).toISOString(),
      durationSeconds: value.duration_seconds,
    }),
    habitTitle: value.habit_templates.title,
  };
}
async function clientFor(userId: string) {
  const { supabase } = await import('../../lib/supabase');
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user || data.user.id !== userId)
    throw new Error('Your account changed. Please sign in again.');
  return supabase;
}
function timeout(signal?: AbortSignal) {
  return signal
    ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
    : AbortSignal.timeout(15_000);
}
export async function saveFocusSession(
  userId: string,
  input: FocusSession,
  signal?: AbortSignal,
): Promise<SavedFocusSession> {
  const session = focusSessionSchema.parse(input);
  const client = await clientFor(userId);
  const { error } = await client
    .from('focus_sessions')
    .upsert(
      {
        id: session.id,
        user_id: userId,
        habit_id: session.habitId,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        duration_seconds: session.durationSeconds,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    .abortSignal(timeout(signal));
  if (error) throw error;
  // Read back the immutable row: a retry after a lost response counts only once.
  const { data, error: readError } = await client
    .from('focus_sessions')
    .select(columns)
    .eq('user_id', userId)
    .eq('id', session.id)
    .abortSignal(timeout(signal))
    .single();
  if (readError) throw readError;
  const saved = convert(data, userId);
  if (
    saved.habitId !== session.habitId ||
    saved.startedAt !== session.startedAt ||
    saved.completedAt !== session.completedAt ||
    saved.durationSeconds !== session.durationSeconds
  ) {
    throw new Error('The saved session does not match this timer.');
  }
  return saved;
}
export async function loadFocusSessions(
  userId: string,
  today: string,
  signal?: AbortSignal,
): Promise<SavedFocusSession[]> {
  const client = await clientFor(userId);
  const earliest = new Date(`${recentDays(today)[0]}T00:00:00`).toISOString();
  const rows: SavedFocusSession[] = [];
  // Page through the whole reporting window rather than silently truncating totals.
  for (let offset = 0; ; offset += 250) {
    const { data, error } = await client
      .from('focus_sessions')
      .select(columns)
      .eq('user_id', userId)
      .gte('completed_at', earliest)
      .order('completed_at', { ascending: false })
      .order('id')
      .range(offset, offset + 249)
      .abortSignal(timeout(signal));
    if (error) throw error;
    rows.push(...(data ?? []).map((row) => convert(row, userId)));
    if (!data || data.length < 250) return rows;
  }
}
export function focusReport(sessions: SavedFocusSession[], today: string) {
  const days = recentDays(today).map((day) => ({ day, seconds: 0, sessions: 0 }));
  const byHabit = new Map<
    string,
    { id: string; title: string; seconds: number; sessions: number }
  >();
  const seen = new Set<string>();
  for (const session of sessions) {
    if (seen.has(session.id)) continue;
    seen.add(session.id);
    const day = days.find((entry) => entry.day === localDay(new Date(session.completedAt)));
    if (!day) continue;
    day.seconds += session.durationSeconds;
    day.sessions++;
    const habit = byHabit.get(session.habitId) ?? {
      id: session.habitId,
      title: session.habitTitle,
      seconds: 0,
      sessions: 0,
    };
    habit.seconds += session.durationSeconds;
    habit.sessions++;
    byHabit.set(habit.id, habit);
  }
  return {
    days,
    habits: [...byHabit.values()].sort(
      (a, b) => b.seconds - a.seconds || a.title.localeCompare(b.title),
    ),
    seconds: days.reduce((sum, day) => sum + day.seconds, 0),
    sessions: days.reduce((sum, day) => sum + day.sessions, 0),
  };
}
