import { z } from 'zod';
import { COMPARE_WEEKS_OPTIONS } from '../discover.config.js';
import { errorSchema } from './people.schema.js';

export { errorSchema };

export const compareWeeksSchema = z.coerce
  .number()
  .int()
  .refine((w) => (COMPARE_WEEKS_OPTIONS as readonly number[]).includes(w), {
    message: 'Invalid compare window.',
  })
  .default(12);

export const compareQuerySchema = z.strictObject({
  weeks: compareWeeksSchema,
});

export const comparePlatformShareSchema = z.strictObject({
  slug: z.string(),
  percent: z.number().int().min(0).max(100),
});

export const compareSideSchema = z.strictObject({
  solved: z.number().int().min(0),
  total: z.number().int().min(0),
  unsolved: z.number().int().min(0),
  solvesPerWeek: z.number().min(0),
  activeWeeks: z.number().int().min(0),
  windowWeeks: z.number().int().min(1),
  streakDays: z.number().int().min(0),
  platformShares: z.array(comparePlatformShareSchema),
});

export const compareTopicRowSchema = z.strictObject({
  normalizedName: z.string(),
  name: z.string(),
  yourPercent: z.number().int().min(0).max(100),
  theirPercent: z.number().int().min(0).max(100),
  yourCompletion: z.number().int().min(0).max(100),
  theirCompletion: z.number().int().min(0).max(100),
});

export const insightActionSchema = z.strictObject({
  kind: z.enum(['openList', 'copyTopic', 'filterLibrary', 'viewProfile']),
  handle: z.string().optional(),
  topicId: z.uuid().optional(),
  topicName: z.string().optional(),
  normalizedName: z.string().optional(),
});

export const compareInsightSchema = z.strictObject({
  kind: z.enum([
    'cadence_gap',
    'top_topic_concentration',
    'topic_focus_gap',
    'missing_topic',
    'platform_concentration',
  ]),
  text: z.string(),
  action: insightActionSchema.nullable(),
});

export const compareResponseSchema = z.strictObject({
  weeks: z.number().int(),
  mode: z.enum(['person', 'peers']),
  handle: z.string().optional(),
  summaryOnlyTopics: z.boolean(),
  me: compareSideSchema,
  them: compareSideSchema,
  topics: z.array(compareTopicRowSchema),
  insights: z.array(compareInsightSchema),
  peerCount: z.number().int().min(0).optional(),
});

export const benchmarkResponseSchema = z.strictObject({
  peerCount: z.number().int().min(0),
  me: compareSideSchema,
  peers: compareSideSchema.nullable(),
  insight: compareInsightSchema.nullable(),
});

export const copyTopicResponseSchema = z.strictObject({
  topicId: z.uuid(),
  topicName: z.string(),
  added: z.number().int().min(0),
  linked: z.number().int().min(0),
});

export type CompareQuery = z.infer<typeof compareQuerySchema>;