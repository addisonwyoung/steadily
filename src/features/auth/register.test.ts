import { beforeEach, expect, it, vi } from 'vitest';
import { registerAccount } from './register';
const { signUp, rpc } = vi.hoisted(() => ({ signUp: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { signUp }, rpc } }));
const input = { username: 'Alex_123', email: 'alex@example.com', password: 'a-long-password' };
beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: true, error: null });
});
it('checks availability and sends the username for the database signup trigger', async () => {
  signUp.mockResolvedValue({ data: { session: null }, error: null });
  await expect(registerAccount(input)).resolves.toBe('confirm-email');
  expect(rpc).toHaveBeenCalledWith('steadily_username_available', { candidate: 'alex_123' });
  expect(signUp).toHaveBeenCalledWith({
    email: input.email,
    password: input.password,
    options: { data: { username: 'alex_123' }, emailRedirectTo: `${window.location.origin}/` },
  });
});
it('rejects a taken username before creating an account', async () => {
  rpc.mockResolvedValue({ data: false, error: null });
  await expect(registerAccount(input)).rejects.toMatchObject({ code: 'username_unavailable' });
  expect(signUp).not.toHaveBeenCalled();
});
it('does not create an account if availability cannot be checked', async () => {
  rpc.mockResolvedValue({ data: null, error: new Error('Unavailable') });
  await expect(registerAccount(input)).rejects.toThrow('Unavailable');
  expect(signUp).not.toHaveBeenCalled();
});
it('propagates API failures instead of reporting success', async () => {
  signUp.mockResolvedValue({ data: { session: null }, error: new Error('Rejected') });
  await expect(registerAccount(input)).rejects.toThrow('Rejected');
});
it('reports a name claimed by another request during signup', async () => {
  rpc
    .mockResolvedValueOnce({ data: true, error: null })
    .mockResolvedValueOnce({ data: false, error: null });
  signUp.mockResolvedValue({ data: null, error: { code: 'unexpected_failure' } });
  await expect(registerAccount(input)).rejects.toMatchObject({ code: 'username_unavailable' });
});
