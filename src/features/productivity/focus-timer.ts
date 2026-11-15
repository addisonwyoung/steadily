import { z } from 'zod';
import { focusSessionSchema } from './focus-sessions';
const seconds = z.number().int().min(0).max(10800);
export const timerSchema = z
  .object({
    version: z.literal(1),
    lengths: z.object({
      focus: z.number().int().min(1).max(180),
      break: z.number().int().min(1).max(180),
    }),
    mode: z.enum(['focus', 'break']),
    remaining: seconds,
    deadline: z.number().finite().nonnegative().nullable(),
    selectedHabitId: z.string(),
    active: z
      .object({
        id: z.uuid(),
        habitId: z.string().min(1),
        startedAt: z.iso.datetime(),
        durationSeconds: seconds.min(60),
      })
      .nullable(),
    pending: z.array(focusSessionSchema).max(1000),
  })
  .superRefine((timer, context) => {
    if (
      timer.remaining > timer.lengths[timer.mode] * 60 ||
      (timer.mode === 'break' && timer.active) ||
      (timer.mode === 'focus' && timer.deadline !== null && !timer.active)
    ) {
      context.addIssue({ code: 'custom', message: 'Invalid timer recovery state.' });
    }
  });
export type FocusTimer = z.infer<typeof timerSchema>;
export const newTimer = (): FocusTimer => ({
  version: 1,
  lengths: { focus: 25, break: 5 },
  mode: 'focus',
  remaining: 1500,
  deadline: null,
  selectedHabitId: '',
  active: null,
  pending: [],
});
export function finishTimer(timer: FocusTimer, now: number): FocusTimer {
  if (timer.deadline === null || timer.deadline > now) return timer;
  const pending = [...timer.pending];
  if (
    timer.mode === 'focus' &&
    timer.active &&
    !pending.some((session) => session.id === timer.active!.id)
  ) {
    pending.push(
      focusSessionSchema.parse({
        ...timer.active,
        completedAt: new Date(timer.deadline).toISOString(),
      }),
    );
  }
  const mode = timer.mode === 'focus' ? 'break' : 'focus';
  return {
    ...timer,
    mode,
    deadline: null,
    remaining: timer.lengths[mode] * 60,
    active: null,
    pending,
  };
}
export function resetTimer(timer: FocusTimer, mode = timer.mode): FocusTimer {
  return { ...timer, mode, deadline: null, remaining: timer.lengths[mode] * 60, active: null };
}
