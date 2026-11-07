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
  const { data: available, error: availabilityError } = await supabase.rpc(
    'steadily_username_available',
    { candidate: values.username },
  );
  if (availabilityError) throw availabilityError;
  if (available !== true) {
    throw Object.assign(new Error('That username is already taken. Choose another.'), {
      code: 'username_unavailable',
    });
  }
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { username: values.username },
      emailRedirectTo: `${window.location.origin}/`,
    },
  });
  if (error) {
    // Another signup can claim the name between the check and account creation.
    if (error.code === 'unexpected_failure' || error.code === 'database_error') {
      const { data: stillAvailable, error: recheckError } = await supabase.rpc(
        'steadily_username_available',
        { candidate: values.username },
      );
      if (!recheckError && stillAvailable === false) {
        throw Object.assign(new Error('That username is already taken. Choose another.'), {
          code: 'username_unavailable',
        });
      }
    }
    throw error;
  }
  // A success without a session may also mask an existing email for privacy.
  return data.session ? 'signed-in' : 'confirm-email';
}
