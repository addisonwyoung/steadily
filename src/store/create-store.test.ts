import { describe, expect, it } from 'vitest';
import { createSteadilyStore } from './create-store';
import { fixture, habitInput, memoryStorage } from '../test/fixtures';
import { LEGACY_KEY, STORAGE_KEY } from '../lib/storage';
import type { CompletionVersion } from '../domain/schema';

function setup() {
  const storage = memoryStorage({ [LEGACY_KEY]: JSON.stringify(fixture()) });
  let day = '2026-09-07';
  let id = 0;
  const store = createSteadilyStore({ storage, today: () => day, createId: () => `habit-${id++}` });
  return {
    store,
    storage,
    setDay: (value: string) => {
      day = value;
    },
  };
}
describe('habit actions', () => {
  it('requires two habits and reassigns priority when removing from three', () => {
    const { store } = setup();
    expect(() => store.getState().removeHabit('walk')).toThrow('at least two');
    store.getState().saveHabit({ ...habitInput, title: 'Read' });
    store.getState().saveHabit({ ...habitInput, title: 'Stretch' });
    store.getState().removeHabit('walk');
    expect(store.getState().data.habits).toHaveLength(2);
    expect(store.getState().data.profile?.priority).toBe(store.getState().data.habits[0]?.id);
    expect(() => store.getState().removeHabit(store.getState().data.habits[0]!.id)).toThrow(
      'at least two',
    );
    const fresh = createSteadilyStore({ storage: memoryStorage() });
    expect(() =>
      fresh.getState().onboard({ name: '', barrier: 'Distraction' }, [habitInput]),
    ).toThrow();
  });
  it('validates IDs and completion types before mutating state', () => {
    const { store } = setup();
    const before = store.getState().data;
    expect(() => store.getState().completeHabit('missing', 'normal')).toThrow();
    expect(() => store.getState().completeHabit('walk', 'invalid' as CompletionVersion)).toThrow();
    expect(store.getState().data).toBe(before);
  });
  it('persists a completion, preserves it during reflection, and supports undo', () => {
    const { store, storage } = setup();
    store.getState().completeHabit('walk', 'minimum');
    store.getState().recordMiss('walk', 'Tiredness');
    expect(store.getState().data.logs['2026-09-07']?.walk).toEqual({
      type: 'minimum',
      reason: 'Tiredness',
    });
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).data.logs['2026-09-07'].walk.type).toBe(
      'minimum',
    );
    store.getState().undoHabit('walk');
    expect(store.getState().data.logs['2026-09-07']?.walk).toBeUndefined();
  });
  it('preserves habit identity and past completions when editing', () => {
    const { store } = setup();
    store.getState().completeHabit('walk', 'normal');
    store.getState().saveHabit({ ...habitInput, normal: 'Walk for 5 minutes' }, 'walk');
    expect(store.getState().data.habits[0]).toMatchObject({
      id: 'walk',
      created: '2026-09-01',
      normal: 'Walk for 5 minutes',
    });
    expect(store.getState().data.logs['2026-09-07']?.walk?.type).toBe('normal');
  });
  it('enforces the five-habit cap inside the store', () => {
    const { store } = setup();
    for (let i = 0; i < 4; i++) store.getState().saveHabit(habitInput);
    expect(() => store.getState().saveHabit(habitInput)).toThrow('five');
    expect(store.getState().data.habits).toHaveLength(5);
  });
  it('requires a reason for each pending habit before saving a check-in atomically', () => {
    const { store } = setup();
    const input = { mood: 3, energy: 2, stress: 4, win: 'I took a break.' };
    expect(() => store.getState().saveCheckIn(input, {})).toThrow();
    expect(store.getState().data.checks).toEqual({});
    store.getState().saveCheckIn(input, { walk: 'Distraction' });
    expect(store.getState().data.checks['2026-09-07']).toEqual(input);
    expect(store.getState().data.logs['2026-09-07']?.walk?.reason).toBe('Distraction');
  });
  it('uses the date at action time after midnight', () => {
    const { store, setDay } = setup();
    setDay('2026-09-08');
    store.getState().completeHabit('walk', 'normal');
    expect(store.getState().data.logs['2026-09-08']?.walk?.type).toBe('normal');
  });
  it('retains in-memory changes with a visible error if saving fails', () => {
    const storage = memoryStorage({ [LEGACY_KEY]: JSON.stringify(fixture()) });
    const store = createSteadilyStore({ storage, today: () => '2026-09-07' });
    storage.setItem = () => {
      throw new Error('Quota');
    };
    store.getState().completeHabit('walk', 'normal');
    expect(store.getState().data.logs['2026-09-07']?.walk?.type).toBe('normal');
    expect(store.getState().storageError).toContain('in memory');
  });
});
describe('offline challenge', () => {
  it('enforces one entry per day and seven entries total', () => {
    const { store, setDay } = setup();
    store.getState().completeChallenge(3, 4);
    expect(() => store.getState().completeChallenge(3, 4)).toThrow('tomorrow');
    for (let day = 8; day <= 13; day++) {
      setDay(`2026-09-${String(day).padStart(2, '0')}`);
      store.getState().completeChallenge(3, 4);
    }
    setDay('2026-09-14');
    expect(() => store.getState().completeChallenge(3, 4)).toThrow('seven');
    expect(store.getState().data.challenge).toHaveLength(7);
  });
  it('rejects invalid ratings without changing progress', () => {
    const { store } = setup();
    expect(() => store.getState().completeChallenge(0, 6)).toThrow();
    expect(store.getState().data.challenge).toHaveLength(0);
  });
});
