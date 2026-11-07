import { beforeEach, expect, it, vi } from 'vitest';
import { fetchAccountProfile } from './profile';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  abortSignal: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ supabase: { from: mocks.from } }));
const id = '11111111-1111-4111-8111-111111111111';
const profile = { id, username: 'alex_123', created_at: '2026-10-09T00:00:00Z' };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue(mocks);
  mocks.select.mockReturnValue(mocks);
  mocks.eq.mockReturnValue(mocks);
  mocks.abortSignal.mockReturnValue(mocks);
});
it('selects only the signed-in user profile by its permanent ID', async () => {
  mocks.maybeSingle.mockResolvedValue({ data: profile, error: null });
  await expect(fetchAccountProfile(id, new AbortController().signal)).resolves.toEqual(profile);
  expect(mocks.from).toHaveBeenCalledWith('profiles');
  expect(mocks.select).toHaveBeenCalledWith('id, username, created_at');
  expect(mocks.eq).toHaveBeenCalledWith('id', id);
});
it('returns null only for a successful response with no row', async () => {
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(fetchAccountProfile(id, new AbortController().signal)).resolves.toBeNull();
});
it('throws API failures even when the result also contains null data', async () => {
  mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });
  await expect(fetchAccountProfile(id, new AbortController().signal)).rejects.toMatchObject({
    message: 'Permission denied',
  });
});
it('rejects malformed and wrong-account results', async () => {
  mocks.maybeSingle.mockResolvedValue({ data: { ...profile, username: '' }, error: null });
  await expect(fetchAccountProfile(id, new AbortController().signal)).rejects.toThrow();
  mocks.maybeSingle.mockResolvedValue({
    data: { ...profile, id: '22222222-2222-4222-8222-222222222222' },
    error: null,
  });
  await expect(fetchAccountProfile(id, new AbortController().signal)).rejects.toThrow(
    'another account',
  );
});
