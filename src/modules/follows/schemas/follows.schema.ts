import { z } from 'zod';
import { paginatedListSchema } from '../../../common/pagination.schema.js';
import { personCardSchema } from '../../discover/schemas/discover.schema.js';
import { errorSchema } from '../../topics/schemas/topics.schema.js';

export { errorSchema };

export const followersCountResponseSchema = z.strictObject({
  count: z.number().int().min(0),
});

export const followingListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
});

export const followingListResponseSchema =
  paginatedListSchema(personCardSchema);

export type FollowingListQuery = z.infer<typeof followingListQuerySchema>;