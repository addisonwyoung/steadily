import { emptyData, type AppData, type HabitInput } from '../domain/schema';
import type { StoragePort } from '../lib/storage';

export const habitInput: HabitInput = {
  title: 'Take a walk',
  normal: 'Walk for 15 minutes',
  minimum: 'Step outside for 2 minutes',
  time: 'Morning',
  icon: '↗',
};
export const fixture = (): AppData => ({
  ...emptyData(),
  profile: { name: 'Sam', barrier: 'Distraction', priority: 'walk' },
  habits: [{ ...habitInput, id: 'walk', created: '2026-09-01' }],
});
export function memoryStorage(
  initial: Record<string, string> = {},
): StoragePort & { values: Map<string, string> } {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
