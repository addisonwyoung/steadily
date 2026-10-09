import { describe, expect, it } from 'vitest';
import { LEGACY_KEY, STORAGE_KEY, loadData, persistData } from './storage';
import { fixture, memoryStorage } from '../test/fixtures';

describe('versioned browser storage', () => {
  it('migrates v1 without changing or deleting the original payload', () => {
    const original = JSON.stringify(fixture());
    const storage = memoryStorage({ [LEGACY_KEY]: original });
    expect(loadData(storage).data).toEqual(fixture());
    expect(storage.getItem(LEGACY_KEY)).toBe(original);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual({ version: 2, data: fixture() });
  });
  it('prefers v2 and does not fall back to stale v1 after an unsupported version', () => {
    const storage = memoryStorage({
      [LEGACY_KEY]: JSON.stringify(fixture()),
      [STORAGE_KEY]: JSON.stringify({ version: 3, data: fixture() }),
    });
    expect(loadData(storage).writable).toBe(false);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).version).toBe(3);
  });
  it.each(['{invalid', JSON.stringify({ version: 2, data: { ...fixture(), habits: [] } })])(
    'preserves invalid storage rather than overwriting it',
    (payload) => {
      const storage = memoryStorage({ [STORAGE_KEY]: payload });
      const result = loadData(storage);
      expect(result.error).toBeTruthy();
      expect(result.writable).toBe(false);
      expect(storage.getItem(STORAGE_KEY)).toBe(payload);
    },
  );
  it('keeps migrated data available when browser writes fail', () => {
    const loaded = loadData({
      getItem: (key) => (key === LEGACY_KEY ? JSON.stringify(fixture()) : null),
      setItem: () => {
        throw new Error('Quota');
      },
    });
    expect(loaded.data).toEqual(fixture());
    expect(loaded.error).toContain('could not save');
  });
  it('validates ratings before persisting a payload', () => {
    const data = fixture();
    data.checks['2026-09-01'] = { mood: 10, energy: 3, stress: 3, win: '' };
    const storage = memoryStorage();
    expect(() => persistData(storage, data)).toThrow();
    expect(storage.values.size).toBe(0);
  });
});
