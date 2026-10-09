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
} from '../domain/schema';
import { isComplete } from '../domain/selectors';
import { localDay } from '../domain/dates';
import { loadData, persistData, type StoragePort } from '../lib/storage';

interface StoreDependencies {
  storage: StoragePort;
  today?: () => string;
  createId?: () => string;
}
export interface SteadilyStore {
  data: AppData;
  storageError: string | null;
  writable: boolean;
  onboard(profile: Pick<Profile, 'name' | 'barrier'>, habits: HabitInput[]): void;
  saveHabit(input: HabitInput, id?: string): void;
  setPriority(id: string): void;
  completeHabit(id: string, version: CompletionVersion): void;
  undoHabit(id: string): void;
  recordMiss(id: string, reason: Reason): void;
  saveCheckIn(input: CheckIn, missedReasons: Record<string, Reason>): void;
  completeChallenge(difficulty: number, enjoyment: number): void;
}

export function createSteadilyStore({
  storage,
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
      onboard(profile, inputs) {
        if (get().data.profile) throw new Error('Onboarding is already complete.');
        const habits = z
          .array(habitInputSchema)
          .min(1)
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
          commit({
            ...data,
            habits: [...data.habits, { ...values, id: createId(), created: currentDay() }],
          });
        }
      },
      setPriority(id) {
        findHabit(id);
        const data = get().data;
        if (!data.profile) throw new Error('Complete onboarding first.');
        commit({ ...data, profile: { ...data.profile, priority: id } });
      },
      completeHabit(id, version) {
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
