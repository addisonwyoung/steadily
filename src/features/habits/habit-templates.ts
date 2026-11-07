import { z } from 'zod';
import { times } from '../../domain/schema';

const templateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(80),
  task: z.string().trim().min(1).max(160),
  suggested_time: z.enum(times),
});
export type HabitTemplate = z.infer<typeof templateSchema>;

export async function fetchHabitTemplates(signal: AbortSignal): Promise<HabitTemplate[]> {
  const { supabase } = await import('../../lib/supabase');
  const { data, error } = await supabase
    .from('habit_templates')
    .select('id, title, task, suggested_time')
    .order('title')
    .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(15_000)]));
  if (error) throw error;
  return z.array(templateSchema).parse(data ?? []);
}
