import { expect, it, vi } from 'vitest';
import { registerAccount } from './register';
const { signUp } = vi.hoisted(() => ({ signUp: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { signUp } } }));
it('sends the username as metadata, with no profile write before authentication', async () => {
  signUp.mockResolvedValue({ data: { session: null }, error: null });
  await expect(
    registerAccount({
      username: 'Alex_123',
      email: 'alex@example.com',
      password: 'a-long-password',
    }),
  ).resolves.toBe('confirm-email');
  expect(signUp).toHaveBeenCalledWith({
    email: 'alex@example.com',
    password: 'a-long-password',
    options: { data: { username: 'alex_123' }, emailRedirectTo: `${window.location.origin}/` },
  });
});
it('propagates API failures instead of reporting success', async () => {
  signUp.mockResolvedValue({ data: { session: null }, error: new Error('Rejected') });
  await expect(
    registerAccount({ username: 'alex', email: 'alex@example.com', password: 'a-long-password' }),
  ).rejects.toThrow('Rejected');
});
