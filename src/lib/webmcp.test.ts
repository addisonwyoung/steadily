import { expect, it } from 'vitest';
import { habitTools } from './webmcp';
import { createSteadilyStore } from '../store/create-store';
import { fixture, memoryStorage } from '../test/fixtures';
import { LEGACY_KEY } from './storage';

it('agent tools use the same validated state actions as the UI', () => {
  const store = createSteadilyStore({
    storage: memoryStorage({ [LEGACY_KEY]: JSON.stringify(fixture()) }),
    today: () => '2026-09-07',
  });
  const [read, complete] = habitTools(store, () => '2026-09-07');
  expect(read?.annotations.readOnlyHint).toBe(true);
  expect(complete?.execute({ habitId: 'walk', version: 'minimum' })).toEqual({
    habitId: 'walk',
    completion: { type: 'minimum' },
  });
  expect(read?.execute({})).toMatchObject({
    habits: [{ id: 'walk', completion: { type: 'minimum' } }],
  });
  expect(() => complete?.execute({ habitId: 'missing', version: 'normal' })).toThrow();
  expect(() => complete?.execute({ habitId: 'walk', version: 'bad' })).toThrow();
  expect(store.getState().data.logs['2026-09-07']?.walk?.type).toBe('minimum');
});
