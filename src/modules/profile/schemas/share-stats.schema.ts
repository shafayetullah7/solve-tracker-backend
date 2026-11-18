import { z } from 'zod';

export const shareStatsQuerySchema = z.strictObject({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

export const shareStatsResponseSchema = z.strictObject({
  profileViews: z.number().int().min(0),
  topicCopies: z.number().int().min(0),
  topics: z.array(
    z.strictObject({
      topicId: z.uuid(),
      views: z.number().int().min(0),
      copies: z.number().int().min(0),
    }),
  ),
});

export type ShareStatsQuery = z.infer<typeof shareStatsQuerySchema>;