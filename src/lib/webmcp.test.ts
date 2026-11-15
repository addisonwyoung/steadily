import { expect, it } from 'vitest';
import { habitTools } from './webmcp';
import { createSteadilyStore } from '../store/create-store';
import { fixture, memoryStorage } from '../test/fixtures';
import { LEGACY_KEY } from './storage';

it('agent tools use the same validated state actions as the UI', async () => {
  const store = createSteadilyStore({
    storage: memoryStorage({ [LEGACY_KEY]: JSON.stringify(fixture()) }),
    today: () => '2026-09-07',
  });
  const [read, complete] = habitTools(store, () => '2026-09-07');
  expect(read?.annotations.readOnlyHint).toBe(true);
  expect(await complete?.execute({ habitId: 'walk', version: 'minimum' })).toEqual({
    habitId: 'walk',
    completion: { type: 'normal' },
  });
  expect(read?.execute({})).toMatchObject({
    habits: [{ id: 'walk', completion: { type: 'normal' } }],
  });
  await expect(complete?.execute({ habitId: 'missing', version: 'normal' })).rejects.toThrow();
  await expect(complete?.execute({ habitId: 'walk', version: 'bad' })).rejects.toThrow();
  expect(store.getState().data.logs['2026-09-07']?.walk?.type).toBe('normal');
});
