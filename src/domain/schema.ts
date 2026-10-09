import { z } from 'zod';

export const reasons = [
  'Tiredness',
  'Insufficient time',
  'Distraction',
  'Forgetting',
  'Excessive difficulty',
] as const;
export const times = ['Morning', 'Afternoon', 'Evening', 'Anytime'] as const;
export const reasonSchema = z.enum(reasons);
export const dateSchema = z.iso.date();
export const ratingSchema = z.number().int().min(1).max(5);
const text = (max: number) => z.string().trim().min(1, 'Please enter a value.').max(max);

export const habitInputSchema = z.object({
  title: text(80),
  normal: text(160),
  minimum: text(160),
  time: z.enum(times),
  icon: z.string().default('✧'),
});
export const habitSchema = habitInputSchema.extend({
  id: z.string().min(1),
  created: dateSchema,
});
export const completionSchema = z.object({
  type: z.enum(['normal', 'minimum', 'missed']),
  reason: reasonSchema.optional(),
});
export const checkInSchema = z.object({
  mood: ratingSchema,
  energy: ratingSchema,
  stress: ratingSchema,
  win: z.string().trim().max(240),
});
export const challengeEntrySchema = z.object({
  date: dateSchema,
  difficulty: ratingSchema,
  enjoyment: ratingSchema,
});
export const profileSchema = z.object({
  name: z.string().trim().max(40),
  barrier: reasonSchema,
  priority: z.string().min(1),
});
// The v1 data shape is retained; versioning belongs to the storage envelope.
export const appDataSchema = z
  .object({
    profile: profileSchema.nullable(),
    habits: z.array(habitSchema).max(5),
    logs: z.record(dateSchema, z.record(z.string(), completionSchema)),
    checks: z.record(dateSchema, checkInSchema),
    challenge: z.array(challengeEntrySchema).max(7),
  })
  .superRefine((data, ctx) => {
    const ids = data.habits.map((habit) => habit.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'Habit IDs must be unique.' });
    }
    if (data.profile && (!ids.length || !ids.includes(data.profile.priority))) {
      ctx.addIssue({ code: 'custom', message: 'A profile needs habits and a valid priority.' });
    }
    const dates = data.challenge.map((entry) => entry.date);
    if (
      new Set(dates).size !== dates.length ||
      dates.some((day, i) => i > 0 && day <= dates[i - 1]!)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Challenge activities must be on distinct, ordered days.',
      });
    }
  });

export type Reason = z.infer<typeof reasonSchema>;
export type HabitInput = z.infer<typeof habitInputSchema>;
export type Habit = z.infer<typeof habitSchema>;
export type Completion = z.infer<typeof completionSchema>;
export type CompletionVersion = 'normal' | 'minimum';
export type CheckIn = z.infer<typeof checkInSchema>;
export type AppData = z.infer<typeof appDataSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type ChallengeEntry = z.infer<typeof challengeEntrySchema>;
export const emptyData = (): AppData => ({
  profile: null,
  habits: [],
  logs: {},
  checks: {},
  challenge: [],
});
