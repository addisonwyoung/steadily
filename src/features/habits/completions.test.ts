import { beforeEach, expect, it, vi } from 'vitest';
import { completionRepository } from './completions';
const { getUser, from, upsert, select, eq, order, range, abortSignal } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  abortSignal: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getUser }, from } }));
const chain = { upsert, select, eq, order, range, abortSignal };
const row = { habit_id: 'walk', day: '2026-11-14', completed: true };
beforeEach(() => {
  vi.resetAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'account-a' } }, error: null });
  from.mockReturnValue(chain);
  for (const method of [upsert, select, eq, order, range]) method.mockReturnValue(chain);
  abortSignal.mockResolvedValue({ data: [row], error: null });
});
it('writes to the signed-in account and records undo as a tombstone', async () => {
  await completionRepository('account-a').save({ ...row, completed: false });
  expect(upsert).toHaveBeenCalledWith([{ ...row, completed: false, user_id: 'account-a' }], {
    onConflict: 'user_id,habit_id,day',
    ignoreDuplicates: false,
  });
});
it('imports old browser records without overwriting server undo records', async () => {
  await completionRepository('account-a').import([row]);
  expect(upsert).toHaveBeenCalledWith([{ ...row, user_id: 'account-a' }], {
    onConflict: 'user_id,habit_id,day',
    ignoreDuplicates: true,
  });
});
it('rejects account changes before querying and reports read failures', async () => {
  await expect(completionRepository('account-b').save(row)).rejects.toThrow('account changed');
  expect(from).not.toHaveBeenCalled();
  abortSignal.mockResolvedValueOnce({ data: null, error: new Error('Offline') });
  await expect(completionRepository('account-a').load()).rejects.toThrow('Offline');
});
it('filters reads by owner and reads all pages rather than truncating the graph', async () => {
  abortSignal
    .mockResolvedValueOnce({ data: Array.from({ length: 500 }, () => row), error: null })
    .mockResolvedValueOnce({ data: [], error: null });
  expect(await completionRepository('account-a').load()).toHaveLength(500);
  expect(eq).toHaveBeenCalledWith('user_id', 'account-a');
  expect(range).toHaveBeenLastCalledWith(500, 999);
});
