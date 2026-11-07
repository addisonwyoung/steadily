import { supabase } from '../../lib/supabase';

export async function fetchHabitTemplates() {
  const { data, error } = await supabase
    .from('habit_templates')
    .select('id, title, task, suggested_time')
    .order('title');

  if (error) {
    throw error;
  }

  return data;
}
