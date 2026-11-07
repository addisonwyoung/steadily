import { z } from 'zod';

// This is the database profile, distinct from the browser's habit-onboarding settings.
export const accountProfileSchema = z.object({
  id: z.uuid(),
  username: z.string().regex(/^[a-z0-9_]{3,24}$/),
  created_at: z.string().min(1),
});
export type AccountProfile = z.infer<typeof accountProfileSchema>;

export async function fetchAccountProfile(
  userId: string,
  signal: AbortSignal,
): Promise<AccountProfile | null> {
  z.uuid().parse(userId);
  const { supabase } = await import('../../lib/supabase');
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, created_at')
    .eq('id', userId)
    .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(15_000)]))
    .maybeSingle();

  // Check errors first: a failed request must never become a "missing profile".
  if (error) throw error;
  if (data === null) return null;
  const profile = accountProfileSchema.parse(data);
  if (profile.id !== userId) throw new Error('The returned profile belongs to another account.');
  return profile;
}
