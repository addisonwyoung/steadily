import { z } from 'zod';
import { appDataSchema, emptyData, type AppData } from '../domain/schema';

export const STORAGE_KEY = 'steadily-v2';
export const LEGACY_KEY = 'steadily-v1';
const envelopeSchema = z.object({ version: z.literal(2), data: appDataSchema });
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface LoadedData {
  data: AppData;
  error: string | null;
  writable: boolean;
}
export function persistData(storage: StoragePort, data: AppData): void {
  const envelope = envelopeSchema.parse({ version: 2, data });
  storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

// Remove the retired custom-habit placeholder without touching completion history.
function removeRetiredPlaceholder(data: AppData): AppData {
  const habits = data.habits.filter(
    (habit) =>
      !(
        !habit.templateId &&
        habit.title.trim().toLowerCase() === 'my small habit' &&
        habit.normal.trim().toLowerCase() === 'spend 10 minutes on my goal'
      ),
  );
  if (habits.length === data.habits.length) return data;
  return appDataSchema.parse({
    ...data,
    habits,
    profile: data.profile
      ? {
          ...data.profile,
          priority: habits.some((habit) => habit.id === data.profile?.priority)
            ? data.profile.priority
            : (habits[0]?.id ?? ''),
        }
      : null,
  });
}

export function loadData(storage: StoragePort): LoadedData {
  try {
    const current = storage.getItem(STORAGE_KEY);
    if (current !== null) {
      const original = envelopeSchema.parse(JSON.parse(current)).data;
      const data = removeRetiredPlaceholder(original);
      if (data !== original) {
        try {
          persistData(storage, data);
        } catch {
          return {
            data,
            error: 'The retired habit was hidden, but this browser could not save the update.',
            writable: true,
          };
        }
      }
      return { data, error: null, writable: true };
    }
    const legacy = storage.getItem(LEGACY_KEY);
    if (legacy === null) return { data: emptyData(), error: null, writable: true };
    const data = removeRetiredPlaceholder(appDataSchema.parse(JSON.parse(legacy)));
    // Keep v1 intact as a recovery copy, including when writing v2 fails.
    try {
      persistData(storage, data);
      return { data, error: null, writable: true };
    } catch {
      return {
        data,
        error:
          'Your previous data loaded, but this browser could not save the upgrade. Keep this page open.',
        writable: true,
      };
    }
  } catch {
    // Never replace an unreadable or unsupported payload with a new empty state.
    return {
      data: emptyData(),
      error:
        'Saved data could not be read. It has been preserved. Saving is paused to avoid replacing it.',
      writable: false,
    };
  }
}
