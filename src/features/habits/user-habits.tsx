import { z } from 'zod';
import { habitSchema, times, type Habit } from '../../domain/schema';
import { localDay } from '../../domain/dates';
import { supabase } from '../../lib/supabase';

const selectionSchema = z.object({
  habit_id: z.string().min(1),
  created_at: z.iso.datetime({ offset: true }),
  habit_templates: z.object({
    id: z.string().min(1),
    title: z.string(),
    task: z.string(),
    suggested_time: z.enum(times),
  }),
});

// Convert database names into the existing shape used by the screens.
export function selectionsToHabits(rows: unknown): Habit[] {
  return z
    .array(selectionSchema)
    .max(5)
    .parse(rows)
    .map((row) => {
      if (row.habit_id !== row.habit_templates.id)
        throw new Error('Habit details do not match the selection.');
      return habitSchema.parse({
        id: row.habit_id,
        templateId: row.habit_id,
        title: row.habit_templates.title,
        normal: row.habit_templates.task,
        time: row.habit_templates.suggested_time,
        icon: '✧',
        created: localDay(new Date(row.created_at)),
      });
    });
}

async function requireUser(expectedUserId?: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user || (expectedUserId && data.user.id !== expectedUserId)) {
    throw new Error('Your account changed. Please reload before saving.');
  }
  return data.user.id;
}

export async function fetchUserHabits(
  expectedUserId?: string,
  signal?: AbortSignal,
): Promise<Habit[]> {
  const userId = await requireUser(expectedUserId);
  const { data, error } = await supabase
    .from('user_habits')
    .select('habit_id, created_at, habit_templates(id, title, task, suggested_time)')
    .eq('user_id', userId)
    .order('created_at')
    .order('habit_id')
    .abortSignal(
      signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
    );
  if (error) throw error;
  return selectionsToHabits(data ?? []);
}

export async function addUserHabit(habitId: string, expectedUserId?: string): Promise<Habit[]> {
  const userId = await requireUser(expectedUserId);
  const { error } = await supabase
    .from('user_habits')
    .upsert(
      { user_id: userId, habit_id: z.string().min(1).parse(habitId) },
      { onConflict: 'user_id,habit_id', ignoreDuplicates: true },
    )
    .abortSignal(AbortSignal.timeout(15_000));
  if (error) throw error;
  return fetchUserHabits(userId);
}

export async function removeUserHabit(habitId: string, expectedUserId?: string): Promise<Habit[]> {
  const userId = await requireUser(expectedUserId);
  const { error } = await supabase
    .from('user_habits')
    .delete()
    .eq('user_id', userId)
    .eq('habit_id', z.string().min(1).parse(habitId))
    .abortSignal(AbortSignal.timeout(15_000));
  if (error) throw error;
  return fetchUserHabits(userId);
}

// One batch: onboarding cannot leave half of its initial selections inserted.
export async function saveInitialUserHabits(
  habitIds: string[],
  expectedUserId?: string,
): Promise<Habit[]> {
  const ids = z.array(z.string().min(1)).min(2).max(5).parse(habitIds);
  if (new Set(ids).size !== ids.length) throw new Error('Choose distinct habits.');
  const userId = await requireUser(expectedUserId);
  const existing = await fetchUserHabits(userId);
  if (new Set([...existing.map((habit) => habit.templateId!), ...ids]).size > 5) {
    throw new Error('Your saved selections changed. Reload to review them.');
  }
  const { error } = await supabase
    .from('user_habits')
    .upsert(
      ids.map((habit_id) => ({ user_id: userId, habit_id })),
      { onConflict: 'user_id,habit_id', ignoreDuplicates: true },
    )
    .abortSignal(AbortSignal.timeout(15_000));
  if (error) throw error;
  return fetchUserHabits(userId);
}

export interface HabitRepository {
  add(id: string): Promise<Habit[]>;
  remove(id: string): Promise<Habit[]>;
  initialize(ids: string[]): Promise<Habit[]>;
}
export function userHabitRepository(userId: string): HabitRepository {
  return {
    add: (id) => addUserHabit(id, userId),
    remove: (id) => removeUserHabit(id, userId),
    initialize: (ids) => saveInitialUserHabits(ids, userId),
  };
}
