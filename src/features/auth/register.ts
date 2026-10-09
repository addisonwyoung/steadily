import { z } from 'zod';

export const registrationSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, 'Use 3–24 letters, numbers, or underscores.'),
  email: z.email('Enter a valid email address.').trim(),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(128, 'Use no more than 128 characters.'),
});
export type Registration = z.infer<typeof registrationSchema>;

export async function registerAccount(input: Registration): Promise<'confirm-email' | 'signed-in'> {
  const values = registrationSchema.parse(input);
  const { supabase } = await import('../../lib/supabase');
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { username: values.username },
      emailRedirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw error;
  // A success without a session may also mask an existing email for privacy.
  return data.session ? 'signed-in' : 'confirm-email';
}
