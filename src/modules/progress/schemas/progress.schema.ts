import { z } from 'zod';

export const progressCountsSchema = z.strictObject({
  total: z.number().int().min(0),
  solved: z.number().int().min(0),
  unsolved: z.number().int().min(0),
});

export const topicProgressSchema = progressCountsSchema.extend({
  id: z.uuid(),
  name: z.string(),
  percentComplete: z
    .number()
    .int()
    .min(0)
    .max(100)
    .meta({ description: 'Rounded solved/total*100; 0 when total is 0.' }),
});

export const progressResponseSchema = z
  .strictObject({
    overall: progressCountsSchema.meta({
      description:
        'Full library counts for the owner. Each problem is counted once (not per topic).',
    }),
    topics: z
      .array(topicProgressSchema)
      .meta({
        description:
          'Every owned topic, including empty topics. Counts reflect the full library, not active list filters.',
      }),
  })
  .meta({
    description: 'Progress summaries (FR-05). Not affected by GET /problems filters.',
  });

export const errorSchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type ProgressCounts = z.infer<typeof progressCountsSchema>;
export type TopicProgress = z.infer<typeof topicProgressSchema>;
export type ProgressResponse = z.infer<typeof progressResponseSchema>;