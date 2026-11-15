import { z } from 'zod';
import { paginatedListSchema } from '../../../common/pagination.schema.js';
import { TOPIC_NAME_MAX, TOPIC_NAME_MIN } from '../topic-name.js';

export const topicNameFieldSchema = z
  .string()
  .meta({
    description: `${TOPIC_NAME_MIN}–${TOPIC_NAME_MAX} Unicode code points after trim.`,
  });

export const createTopicSchema = z.strictObject({
  name: topicNameFieldSchema,
});

export const renameTopicSchema = createTopicSchema;

export const listTopicsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const topicIdParamSchema = z.uuid();

export const topicResponseSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const topicListResponseSchema = paginatedListSchema(topicResponseSchema);

export const errorSchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type RenameTopicInput = z.infer<typeof renameTopicSchema>;
export type ListTopicsQuery = z.infer<typeof listTopicsQuerySchema>;