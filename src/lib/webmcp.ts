import { z } from 'zod';
import { localDay } from '../domain/dates';
import type { SteadilyStoreApi } from '../store/create-store';

export interface ModelTool {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint?: boolean };
  execute(input: unknown): unknown;
}
interface ModelContext {
  registerTool(tool: ModelTool, options?: { signal: AbortSignal }): void | Promise<void>;
}
const completionInput = z
  .object({ habitId: z.string().min(1), version: z.enum(['normal', 'minimum']) })
  .strict();
export function habitTools(store: SteadilyStoreApi, today = localDay): ModelTool[] {
  return [
    {
      name: 'read_today_habits',
      description: 'Read today’s habits and completion state.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        z.object({}).strict().parse(input);
        const data = store.getState().data,
          day = today();
        return {
          date: day,
          habits: data.habits.map((habit) => ({
            ...habit,
            completion: data.logs[day]?.[habit.id] ?? null,
          })),
        };
      },
    },
    {
      name: 'complete_habit',
      description: 'Record a normal or minimum completion for an existing habit today.',
      inputSchema: {
        type: 'object',
        properties: {
          habitId: { type: 'string' },
          version: { type: 'string', enum: ['normal', 'minimum'] },
        },
        required: ['habitId', 'version'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute(input) {
        const { habitId, version } = completionInput.parse(input);
        store.getState().completeHabit(habitId, version);
        return { habitId, completion: store.getState().data.logs[today()]?.[habitId] };
      },
    },
  ];
}
export function registerHabitTools(store: SteadilyStoreApi) {
  const context = (document as Document & { modelContext?: ModelContext }).modelContext;
  if (!context?.registerTool) return () => undefined;
  const controller = new AbortController();
  for (const tool of habitTools(store)) {
    try {
      void Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(
        () => undefined,
      );
    } catch {
      /* Optional browser capability; UI remains available. */
    }
  }
  return () => controller.abort();
}
