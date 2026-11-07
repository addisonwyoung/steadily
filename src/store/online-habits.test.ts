import { describe, expect, it, vi } from 'vitest';
import { createSteadilyStore } from './create-store';
import { fixture, habitInput, memoryStorage } from '../test/fixtures';
import { STORAGE_KEY } from '../lib/storage';
import type { Habit } from '../domain/schema';
import type { HabitRepository } from '../features/habits/user-habits';

const online = (id: string): Habit => ({
  id,
  templateId: id,
  title: id,
  normal: `Do ${id}`,
  time: 'Morning',
  icon: '✧',
  created: '2026-09-01',
});
function setup() {
  const data = fixture();
  data.habits = [online('walk'), online('read')];
  data.profile!.priority = 'walk';
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 2, data }) });
  const repository: HabitRepository = {
    add: vi.fn().mockResolvedValue([...data.habits, online('stretch')]),
    remove: vi.fn().mockResolvedValue(data.habits),
    initialize: vi.fn().mockResolvedValue(data.habits),
  };
  const store = createSteadilyStore({ storage, habitRepository: repository });
  return { store, repository, storage };
}

describe('online habit actions', () => {
  it('waits for the database and blocks concurrent clicks', async () => {
    const { store, repository } = setup();
    let finish!: (habits: Habit[]) => void;
    vi.mocked(repository.add).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const saving = store.getState().addSelectedHabit({ ...habitInput, templateId: 'stretch' });
    expect(store.getState().habitsSaving).toBe(true);
    expect(store.getState().data.habits).toHaveLength(2);
    await expect(
      store.getState().addSelectedHabit({ ...habitInput, templateId: 'other' }),
    ).rejects.toThrow('wait');
    finish([online('walk'), online('read'), online('stretch')]);
    await saving;
    expect(store.getState().habitsSaving).toBe(false);
    expect(store.getState().data.habits).toHaveLength(3);
  });
  it('leaves selections unchanged after a failed save and unlocks retry', async () => {
    const { store, repository } = setup();
    vi.mocked(repository.add).mockRejectedValue(new Error('Offline'));
    const before = store.getState().data;
    await expect(
      store.getState().addSelectedHabit({ ...habitInput, templateId: 'stretch' }),
    ).rejects.toThrow('Offline');
    expect(store.getState().data).toBe(before);
    expect(store.getState().habitsSaving).toBe(false);
  });
  it('saves removals using the template ID and keeps the minimum', async () => {
    const { store, repository } = setup();
    await expect(store.getState().removeSelectedHabit('walk')).rejects.toThrow('two');
    expect(repository.remove).not.toHaveBeenCalled();
    await store.getState().addSelectedHabit({ ...habitInput, templateId: 'stretch' });
    await store.getState().removeSelectedHabit('stretch');
    expect(repository.remove).toHaveBeenCalledWith('stretch');
    expect(store.getState().data.habits).toHaveLength(2);
  });
  it('finishes onboarding only after its batch save succeeds', async () => {
    const { repository } = setup();
    const store = createSteadilyStore({ storage: memoryStorage(), habitRepository: repository });
    vi.mocked(repository.initialize).mockRejectedValueOnce(new Error('Unavailable'));
    const inputs = [
      { ...habitInput, templateId: 'walk' },
      { ...habitInput, templateId: 'read' },
    ];
    await expect(
      store.getState().finishOnboarding({ name: 'Sam', barrier: 'Distraction' }, inputs),
    ).rejects.toThrow();
    expect(store.getState().data.profile).toBeNull();
    await store.getState().finishOnboarding({ name: 'Sam', barrier: 'Distraction' }, inputs);
    expect(repository.initialize).toHaveBeenCalledWith(['walk', 'read']);
    expect(store.getState().data.profile?.name).toBe('Sam');
    expect(store.getState().data.habits).toHaveLength(2);
  });
  it('uses server selections over a stale browser list while preserving matching local history', () => {
    const { store, storage } = setup();
    store.getState().completeHabit('walk');
    const logs = store.getState().data.logs;
    store.getState().setUserHabits([online('walk'), online('stretch')]);
    expect(store.getState().data.habits.map((habit) => habit.templateId)).toEqual([
      'walk',
      'stretch',
    ]);
    expect(store.getState().data.logs).toEqual(logs);
    expect(createSteadilyStore({ storage }).getState().data.habits).toEqual(
      store.getState().data.habits,
    );
  });
});
