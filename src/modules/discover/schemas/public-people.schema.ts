import { z } from 'zod';
import { paginatedListSchema } from '../../../common/pagination.schema.js';
import { progressActivityResponseSchema } from '../../progress/schemas/activity.schema.js';
import { problemStatusSchema } from '../../problems/schemas/problems.schema.js';
import { LIST_PLATFORM_FILTER_SLUGS } from '../../problems/problem-platform-filter.js';
import { problemPlatformSlugSchema } from '../../problems/schemas/problems.schema.js';
import { errorSchema } from '../../topics/schemas/topics.schema.js';
import {
  listPeopleProblemsQuerySchema,
  peopleTopicsResponseSchema,
  personHeaderResponseSchema,
  publicTopicHeaderSchema,
} from './people.schema.js';

export { errorSchema };

export const publicPersonHeaderResponseSchema = personHeaderResponseSchema.omit({
  viewerFollows: true,
});

export const anonymousPublicProblemRowSchema = z.strictObject({
  title: z.string(),
  url: z.string(),
  platformSlug: problemPlatformSlugSchema,
  platformProblemId: z.string().nullable(),
  difficulty: z.string().nullable(),
  rating: z.number().int().nullable(),
  ownerStatus: problemStatusSchema,
});

export const anonymousPeopleProblemsListSchema = paginatedListSchema(
  anonymousPublicProblemRowSchema,
);

export const publicActivityQuerySchema = z.strictObject({
  weeks: z.coerce.number().int().min(1).max(52).default(12),
});

export {
  peopleTopicsResponseSchema as publicPeopleTopicsResponseSchema,
  publicTopicHeaderSchema as publicPublicTopicHeaderSchema,
  listPeopleProblemsQuerySchema as publicListPeopleProblemsQuerySchema,
  progressActivityResponseSchema as publicActivityResponseSchema,
};

export type PublicActivityQuery = z.infer<typeof publicActivityQuerySchema>;