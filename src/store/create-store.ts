import type { HabitRepository } from '../features/habits/user-habits';
import { createStore } from 'zustand/vanilla';
import { z } from 'zod';
import {
  appDataSchema,
  habitInputSchema,
  checkInSchema,
  reasonSchema,
  dateSchema,
  challengeEntrySchema,
  profileSchema,
  type AppData,
  type HabitInput,
  type CompletionVersion,
  type Reason,
  type CheckIn,
  type Profile,
  type Habit,
} from '../domain/schema';
import { isComplete } from '../domain/selectors';
import { localDay } from '../domain/dates';
import { loadData, persistData, type StoragePort } from '../lib/storage';

interface StoreDependencies {
  storage: StoragePort;
  habitRepository?: HabitRepository;
  today?: () => string;
  createId?: () => string;
}
export interface SteadilyStore {
  data: AppData;
  storageError: string | null;
  writable: boolean;
  onboard(profile: Pick<Profile, 'name' | 'barrier'>, habits: HabitInput[]): void;
  saveHabit(input: HabitInput, id?: string): void;
  removeHabit(id: string): void;
  setPriority(id: string): void;
  completeHabit(id: string, version?: CompletionVersion): void;
  undoHabit(id: string): void;
  recordMiss(id: string, reason: Reason): void;
  saveCheckIn(input: CheckIn, missedReasons: Record<string, Reason>): void;
  completeChallenge(difficulty: number, enjoyment: number): void;
  setUserHabits(habits: Habit[]): void;
  habitsSaving: boolean;
  addSelectedHabit(input: HabitInput): Promise<void>;
  removeSelectedHabit(id: string): Promise<void>;
  finishOnboarding(profile: Pick<Profile, 'name' | 'barrier'>, inputs: HabitInput[]): Promise<void>;
}

export function createSteadilyStore({
  storage,
  habitRepository,
  today = localDay,
  createId = () => crypto.randomUUID(),
}: StoreDependencies) {
  const initial = loadData(storage);
  return createStore<SteadilyStore>((set, get) => {
    const currentDay = () => dateSchema.parse(today());
    const findHabit = (id: string) => {
      const habit = get().data.habits.find((candidate) => candidate.id === id);
      if (!habit) throw new Error('That habit no longer exists.');
      if (habit.created > currentDay()) throw new Error('This habit begins on a future date.');
      return habit;
    };
    const commit = (data: AppData) => {
      const validated = appDataSchema.parse(data);
      if (!get().writable) throw new Error(get().storageError ?? 'Saving is paused.');
      let storageError: string | null = null;
      try {
        persistData(storage, validated);
      } catch {
        storageError =
          'This change is in memory, but could not be saved. Keep this page open and allow browser storage.';
      }
      set({ data: validated, storageError });
    };
    return {
      ...initial,
      storageError: initial.error,
      habitsSaving: false,
      setUserHabits(incoming) {
        const data = get().data;
        // Preserve browser-only history when an old local ID represented the same template.
        const habits = incoming.map((habit) => {
          const old = data.habits.find(
            (candidate) =>
              candidate.templateId === habit.templateId ||
              (!candidate.templateId &&
                (candidate.title === habit.title || candidate.normal === habit.normal)),
          );
          return old ? { ...habit, id: old.id, created: old.created } : habit;
        });
        const priority = habits.some((habit) => habit.id === data.profile?.priority)
          ? data.profile!.priority
          : (habits[0]?.id ?? '');
        const profile = data.profile
          ? { ...data.profile, priority }
          : habits.length
            ? { name: '', barrier: 'Distraction' as const, priority }
            : null;
        commit({ ...data, habits, profile });
      },
      async addSelectedHabit(input) {
        if (get().habitsSaving) throw new Error('Please wait for your habits to finish saving.');
        if (!get().writable) throw new Error('Saving is paused.');
        const values = habitInputSchema.parse(input);
        if (!values.templateId) throw new Error('Choose a habit from the list.');
        if (get().data.habits.length >= 5) throw new Error('Keep your list to five habits.');
        if (get().data.habits.some((habit) => habit.templateId === values.templateId)) return;
        set({ habitsSaving: true });
        try {
          if (habitRepository) get().setUserHabits(await habitRepository.add(values.templateId));
          else get().saveHabit(values);
        } finally {
          set({ habitsSaving: false });
        }
      },
      async removeSelectedHabit(id) {
        if (get().habitsSaving) throw new Error('Please wait for your habits to finish saving.');
        if (!get().writable) throw new Error('Saving is paused.');
        const habit = findHabit(id);
        if (get().data.habits.length <= 2)
          throw new Error('Keep at least two habits in your list.');
        set({ habitsSaving: true });
        try {
          if (habitRepository) {
            if (!habit.templateId)
              throw new Error(
                'This old habit is not linked to the online list. Reload to reconcile your habits.',
              );
            get().setUserHabits(await habitRepository.remove(habit.templateId));
          } else get().removeHabit(id);
        } finally {
          set({ habitsSaving: false });
        }
      },
      async finishOnboarding(profile, inputs) {
        if (get().habitsSaving) throw new Error('Please wait for your habits to finish saving.');
        if (!get().writable) throw new Error('Saving is paused.');
        const values = z.array(habitInputSchema).min(2).max(5).parse(inputs);
        profileSchema.parse({ ...profile, priority: 'pending' });
        set({ habitsSaving: true });
        try {
          if (habitRepository) {
            const ids = values.map((habit) => {
              if (!habit.templateId) throw new Error('Choose habits from the list.');
              return habit.templateId;
            });
            get().setUserHabits(await habitRepository.initialize(ids));
            const data = get().data;
            commit({ ...data, profile: { ...profile, priority: data.habits[0]!.id } });
          } else get().onboard(profile, values);
        } finally {
          set({ habitsSaving: false });
        }
      },
      onboard(profile, inputs) {
        if (get().data.profile) throw new Error('Onboarding is already complete.');
        const habits = z
          .array(habitInputSchema)
          .min(2)
          .max(5)
          .parse(inputs)
          .map((input) => ({ ...input, id: createId(), created: currentDay() }));
        const parsedProfile = profileSchema.parse({ ...profile, priority: habits[0]!.id });
        commit({ ...get().data, profile: parsedProfile, habits });
      },
      saveHabit(input, id) {
        const values = habitInputSchema.parse(input);
        const data = get().data;
        if (!data.profile) throw new Error('Complete onboarding first.');
        if (id) {
          findHabit(id);
          commit({
            ...data,
            habits: data.habits.map((habit) => (habit.id === id ? { ...habit, ...values } : habit)),
          });
        } else {
          if (data.habits.length >= 5) throw new Error('Keep your list to five habits.');
          if (
            values.templateId &&
            data.habits.some((habit) => habit.templateId === values.templateId)
          ) {
            throw new Error('This suggestion is already in your habits.');
          }
          const habit = { ...values, id: createId(), created: currentDay() };
          commit({
            ...data,
            habits: [...data.habits, habit],
            profile: data.habits.length ? data.profile : { ...data.profile, priority: habit.id },
          });
        }
      },
      removeHabit(id) {
        findHabit(id);
        if (get().data.habits.length <= 2)
          throw new Error('Keep at least two habits in your list.');
        const data = get().data;
        const habits = data.habits.filter((habit) => habit.id !== id);
        commit({
          ...data,
          habits,
          profile: data.profile
            ? {
                ...data.profile,
                priority:
                  data.profile.priority === id ? (habits[0]?.id ?? '') : data.profile.priority,
              }
            : null,
        });
      },
      setPriority(id) {
        findHabit(id);
        const data = get().data;
        if (!data.profile) throw new Error('Complete onboarding first.');
        commit({ ...data, profile: { ...data.profile, priority: id } });
      },
      completeHabit(id, version = 'normal') {
        findHabit(id);
        z.enum(['normal', 'minimum']).parse(version);
        const data = get().data,
          day = currentDay();
        commit({
          ...data,
          logs: {
            ...data.logs,
            [day]: { ...data.logs[day], [id]: { ...data.logs[day]?.[id], type: version } },
          },
        });
      },
      undoHabit(id) {
        findHabit(id);
        const data = get().data,
          day = currentDay();
        const entries = { ...data.logs[day] };
        delete entries[id];
        commit({ ...data, logs: { ...data.logs, [day]: entries } });
      },
      recordMiss(id, reason) {
        findHabit(id);
        reasonSchema.parse(reason);
        const data = get().data,
          day = currentDay();
        const entry = data.logs[day]?.[id];
        // A reflection must never turn an already completed habit into a miss.
        commit({
          ...data,
          logs: {
            ...data.logs,
            [day]: {
              ...data.logs[day],
              [id]: { type: isComplete(entry) ? entry!.type : 'missed', reason },
            },
          },
        });
      },
      saveCheckIn(input, missedReasons) {
        const check = checkInSchema.parse(input);
        const data = get().data,
          day = currentDay();
        if (!data.profile) throw new Error('Complete onboarding first.');
        const entries = { ...data.logs[day] };
        for (const habit of data.habits) {
          if (!isComplete(entries[habit.id])) {
            entries[habit.id] = {
              type: 'missed',
              reason: reasonSchema.parse(missedReasons[habit.id]),
            };
          }
        }
        // Check-in and missed-habit reasons are one atomic update.
        commit({
          ...data,
          checks: { ...data.checks, [day]: check },
          logs: { ...data.logs, [day]: entries },
        });
      },
      completeChallenge(difficulty, enjoyment) {
        const data = get().data,
          day = currentDay();
        if (!data.profile) throw new Error('Complete onboarding first.');
        if (data.challenge.length >= 7) throw new Error('You have completed all seven activities.');
        if (data.challenge.some((entry) => entry.date >= day))
          throw new Error('One activity is enough today. Come back tomorrow.');
        const entry = challengeEntrySchema.parse({ date: day, difficulty, enjoyment });
        commit({ ...data, challenge: [...data.challenge, entry] });
      },
    };
  });
}
export type SteadilyStoreApi = ReturnType<typeof createSteadilyStore>;
