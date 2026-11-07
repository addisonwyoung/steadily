import { expect, it } from 'vitest';
import { accountStorage } from './account-store';
import { memoryStorage, fixture } from '../test/fixtures';
import { STORAGE_KEY } from '../lib/storage';
import { createSteadilyStore } from './create-store';

it('isolates accounts and leaves anonymous data intact', () => {
  const original = JSON.stringify({ version: 2, data: fixture() });
  const storage = memoryStorage({ [STORAGE_KEY]: original });
  const first = createSteadilyStore({ storage: accountStorage('a', storage) });
  const second = createSteadilyStore({ storage: accountStorage('b', storage) });
  expect(first.getState().data.profile).toBeNull();
  accountStorage('a', storage).setItem(STORAGE_KEY, original);
  expect(second.getState().data.profile).toBeNull();
  expect(accountStorage('b', storage).getItem(STORAGE_KEY)).toBeNull();
  expect(storage.getItem(STORAGE_KEY)).toBe(original);
  expect(createSteadilyStore({ storage: accountStorage('a', storage) }).getState().data).toEqual(
    fixture(),
  );
});
