import { z } from 'zod';

export const activityQuerySchema = z.strictObject({
  weeks: z.coerce.number().int().min(1).max(52).default(12),
});

export const activityWeekBucketSchema = z.strictObject({
  weekStart: z.string().meta({
    description: 'ISO calendar date (YYYY-MM-DD) of Monday UTC for this bucket.',
  }),
  added: z.number().int().min(0),
  solved: z.number().int().min(0),
});

export const activityStreakSchema = z.strictObject({
  currentDays: z
    .number()
    .int()
    .min(0)
    .meta({
      description:
        'Consecutive solve days ending on the most recent solve day, if that day is today or yesterday (UTC); otherwise 0.',
    }),
  lastSolveDate: z
    .string()
    .nullable()
    .meta({ description: 'ISO date (UTC) of the latest day with at least one solve.' }),
});

export const progressActivityResponseSchema = z
  .strictObject({
    weeks: z.array(activityWeekBucketSchema),
    streak: activityStreakSchema,
    timezone: z.literal('UTC'),
  })
  .meta({
    description:
      'Weekly adds (createdAt) and solves (solvedAt). Supplementary to FR-05 GET /progress summaries.',
  });

export type ActivityQuery = z.infer<typeof activityQuerySchema>;
export type ProgressActivityResponse = z.infer<typeof progressActivityResponseSchema>;