import { beforeEach, expect, it, vi } from 'vitest';
import { loadFocusSessions, saveFocusSession } from './focus-sessions';
const { getUser, from, upsert, select, eq, gte, order, range, abortSignal, single } = vi.hoisted(
  () => ({
    getUser: vi.fn(),
    from: vi.fn(),
    upsert: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    abortSignal: vi.fn(),
    single: vi.fn(),
  }),
);
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getUser }, from } }));
const userId = 'a1111111-1111-4111-8111-111111111111';
const session = {
  id: 'b1111111-1111-4111-8111-111111111111',
  habitId: 'read',
  startedAt: '2026-11-07T09:00:00.000Z',
  completedAt: '2026-11-07T09:25:00.000Z',
  durationSeconds: 1500,
};
const row = {
  id: session.id,
  user_id: userId,
  habit_id: 'read',
  started_at: session.startedAt,
  completed_at: session.completedAt,
  duration_seconds: 1500,
  habit_templates: { title: 'Read' },
};
const chain = { upsert, select, eq, gte, order, range, abortSignal, single };
beforeEach(() => {
  vi.resetAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  from.mockReturnValue(chain);
  for (const method of [upsert, select, eq, gte, order, range]) method.mockReturnValue(chain);
  abortSignal.mockReturnValue(chain);
  single.mockResolvedValue({ data: row, error: null });
});
it('uses the same immutable ID on retries and scopes read-back to its owner', async () => {
  await saveFocusSession(userId, session);
  await saveFocusSession(userId, session);
  expect(upsert).toHaveBeenCalledTimes(2);
  expect(upsert).toHaveBeenLastCalledWith(
    expect.objectContaining({ id: session.id, user_id: userId, habit_id: 'read' }),
    { onConflict: 'id', ignoreDuplicates: true },
  );
  expect(eq).toHaveBeenCalledWith('user_id', userId);
  expect(eq).toHaveBeenCalledWith('id', session.id);
});
it('does not write after the signed-in account changes', async () => {
  await expect(saveFocusSession('c1111111-1111-4111-8111-111111111111', session)).rejects.toThrow(
    'account changed',
  );
  expect(from).not.toHaveBeenCalled();
});
it('reports failed inserts and mismatched duplicate IDs', async () => {
  abortSignal.mockResolvedValueOnce({ error: new Error('Denied') });
  await expect(saveFocusSession(userId, session)).rejects.toThrow('Denied');
  single.mockResolvedValueOnce({ data: { ...row, habit_id: 'walk' }, error: null });
  await expect(saveFocusSession(userId, session)).rejects.toThrow('does not match');
});
it('never accepts a session returned for another account', async () => {
  single.mockResolvedValue({
    data: { ...row, user_id: 'c1111111-1111-4111-8111-111111111111' },
    error: null,
  });
  await expect(saveFocusSession(userId, session)).rejects.toThrow('different account');
});
it('pages through history and surfaces query failures', async () => {
  abortSignal
    .mockResolvedValueOnce({ data: Array.from({ length: 250 }, () => row), error: null })
    .mockResolvedValueOnce({ data: [row], error: null });
  expect(await loadFocusSessions(userId, '2026-11-07')).toHaveLength(251);
  expect(range).toHaveBeenNthCalledWith(1, 0, 249);
  expect(range).toHaveBeenNthCalledWith(2, 250, 499);
  abortSignal.mockResolvedValueOnce({ data: null, error: new Error('Offline') });
  await expect(loadFocusSessions(userId, '2026-11-07')).rejects.toThrow('Offline');
});
