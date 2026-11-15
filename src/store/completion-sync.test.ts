import { expect, it, vi } from 'vitest';
import { createSteadilyStore } from './create-store';
import { fixture, memoryStorage } from '../test/fixtures';
import { STORAGE_KEY } from '../lib/storage';
import { getProgress, getWeek } from '../domain/selectors';
import type { CompletionRepository, CompletionRow } from '../features/habits/completions';
function setup() {
  const data = fixture();
  data.habits[0]!.templateId = 'walk-template';
  const remote: CompletionRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn(),
    import: vi.fn(),
  };
  const store = createSteadilyStore({
    storage: memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 2, data }) }),
    completions: remote,
    today: () => '2026-11-14',
  });
  return { store, remote };
}
it('saves complete and undo to the same account-scoped habit/date before updating the graph', async () => {
  const { store, remote } = setup();
  await store.getState().completeOnline('walk');
  expect(remote.save).toHaveBeenLastCalledWith({
    habit_id: 'walk-template',
    day: '2026-11-14',
    completed: true,
  });
  expect(getWeek(store.getState().data, '2026-11-14').at(-1)?.completed).toBe(1);
  await store.getState().undoOnline('walk');
  expect(remote.save).toHaveBeenLastCalledWith({
    habit_id: 'walk-template',
    day: '2026-11-14',
    completed: false,
  });
  expect(getWeek(store.getState().data, '2026-11-14').at(-1)?.completed).toBe(0);
});
it('does not change visible history after failed writes and rejects overlapping clicks', async () => {
  const { store, remote } = setup();
  let reject!: (error: Error) => void;
  vi.mocked(remote.save).mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  const pending = store.getState().completeOnline('walk');
  await expect(store.getState().undoOnline('walk')).rejects.toThrow('wait');
  expect(store.getState().data.logs).toEqual({});
  reject(new Error('Offline'));
  await expect(pending).rejects.toThrow('Offline');
  expect(store.getState().completionSaving).toBe(false);
  expect(store.getState().data.logs).toEqual({});
});
it('hydrates identical graph data on another browser and clears undone local completions', async () => {
  const a = setup().store;
  const b = setup().store;
  await a.getState().completeOnline('walk');
  const rows: CompletionRow[] = [{ habit_id: 'walk-template', day: '2026-11-14', completed: true }];
  a.getState().setCompletions(rows);
  b.getState().setCompletions(rows);
  expect(getProgress(a.getState().data, '2026-11-14')).toEqual(
    getProgress(b.getState().data, '2026-11-14'),
  );
  expect(getWeek(a.getState().data, '2026-11-14')).toEqual(
    getWeek(b.getState().data, '2026-11-14'),
  );
  b.getState().setCompletions([{ ...rows[0]!, completed: false }]);
  expect(b.getState().data.logs['2026-11-14']?.walk).toBeUndefined();
});
