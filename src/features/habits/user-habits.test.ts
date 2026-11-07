import { beforeEach, expect, it, vi } from 'vitest';
import {
  addUserHabit,
  removeUserHabit,
  selectionsToHabits,
  saveInitialUserHabits,
} from './user-habits';
const { getUser, from, upsert, remove, eq, select, order, abortSignal } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  abortSignal: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getUser }, from } }));
const chain = { upsert, delete: remove, eq, select, order, abortSignal };
const row = {
  habit_id: 'walk',
  created_at: '2026-09-01T12:00:00Z',
  habit_templates: {
    id: 'walk',
    title: 'Walk',
    task: 'Walk for 15 minutes',
    suggested_time: 'Morning',
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'account-a' } }, error: null });
  from.mockReturnValue(chain);
  for (const method of [upsert, remove, eq, select, order]) method.mockReturnValue(chain);
  abortSignal.mockResolvedValue({ data: [row], error: null });
});
it('converts joined rows and rejects missing or mismatched templates', () => {
  expect(selectionsToHabits([row])[0]).toMatchObject({
    id: 'walk',
    templateId: 'walk',
    normal: 'Walk for 15 minutes',
  });
  expect(() => selectionsToHabits([{ ...row, habit_templates: null }])).toThrow();
  expect(() => selectionsToHabits([{ ...row, habit_id: 'other' }])).toThrow();
});
it('scopes inserts to the authenticated user and supports safe retries', async () => {
  await addUserHabit('walk', 'account-a');
  expect(upsert).toHaveBeenCalledWith(
    { user_id: 'account-a', habit_id: 'walk' },
    { onConflict: 'user_id,habit_id', ignoreDuplicates: true },
  );
});
it('scopes deletes to both user and habit', async () => {
  await removeUserHabit('walk', 'account-a');
  expect(eq).toHaveBeenCalledWith('user_id', 'account-a');
  expect(eq).toHaveBeenCalledWith('habit_id', 'walk');
});
it('rejects signed-out or switched accounts before writing', async () => {
  await expect(addUserHabit('walk', 'account-b')).rejects.toThrow('account changed');
  expect(from).not.toHaveBeenCalled();
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  await expect(removeUserHabit('walk')).rejects.toThrow();
  expect(from).not.toHaveBeenCalled();
});
it('reports database failure instead of claiming success', async () => {
  abortSignal.mockResolvedValueOnce({ data: null, error: new Error('Write blocked') });
  await expect(addUserHabit('walk')).rejects.toThrow('Write blocked');
});
it('sends initial choices in one batch and rejects invalid counts before contacting the database', async () => {
  await expect(saveInitialUserHabits(['walk'])).rejects.toThrow();
  expect(from).not.toHaveBeenCalled();
  await saveInitialUserHabits(['walk', 'read'], 'account-a');
  expect(upsert).toHaveBeenCalledWith(
    [
      { user_id: 'account-a', habit_id: 'walk' },
      { user_id: 'account-a', habit_id: 'read' },
    ],
    { onConflict: 'user_id,habit_id', ignoreDuplicates: true },
  );
});
