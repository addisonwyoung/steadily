import { z } from 'zod';
import { dateSchema } from '../../domain/schema';
const rowSchema = z.object({
  habit_id: z.string().min(1),
  day: dateSchema,
  completed: z.boolean(),
});
export type CompletionRow = z.infer<typeof rowSchema>;
export interface CompletionRepository {
  load(signal?: AbortSignal): Promise<CompletionRow[]>;
  save(row: CompletionRow): Promise<void>;
  import(rows: CompletionRow[]): Promise<void>;
}
export function completionRepository(userId: string): CompletionRepository {
  async function client() {
    const { supabase } = await import('../../lib/supabase');
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (data.user?.id !== userId) throw new Error('Your account changed. Reload before saving.');
    return supabase;
  }
  async function write(rows: CompletionRow[], ignoreDuplicates: boolean) {
    if (!rows.length) return;
    const supabase = await client();
    const values = z
      .array(rowSchema)
      .parse(rows)
      .map((row) => ({ ...row, user_id: userId }));
    const { error } = await supabase
      .from('habit_completions')
      .upsert(values, {
        onConflict: 'user_id,habit_id,day',
        ignoreDuplicates,
      })
      .abortSignal(AbortSignal.timeout(15000));
    if (error) throw error;
  }
  return {
    async load(signal) {
      const supabase = await client();
      const rows: CompletionRow[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from('habit_completions')
          .select('habit_id, day, completed')
          .eq('user_id', userId)
          .order('day')
          .order('habit_id')
          .range(offset, offset + 499)
          .abortSignal(
            signal
              ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
              : AbortSignal.timeout(15000),
          );
        if (error) throw error;
        const page = z.array(rowSchema).parse(data ?? []);
        rows.push(...page);
        if (page.length < 500) return rows;
      }
    },
    save: (row) => write([row], false),
    import: (rows) => write(rows, true),
  };
}
