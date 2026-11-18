import { z } from 'zod';
import { paginatedListSchema } from '../../../common/pagination.schema.js';
import { practiceGoalSchema } from '../../../common/schemas/practice-discovery.schema.js';
import { progressCountsSchema } from '../../progress/schemas/progress.schema.js';
import { errorSchema } from '../../topics/schemas/topics.schema.js';
import { problemStatusSchema } from '../../problems/schemas/problems.schema.js';
import { LIST_PLATFORM_FILTER_SLUGS } from '../../problems/problem-platform-filter.js';
import { problemPlatformSlugSchema } from '../../problems/schemas/problems.schema.js';
import { DIFFICULTY_HISTOGRAM_BUCKETS } from '../difficulty-histogram.js';

export { errorSchema };

export const personHeaderResponseSchema = z.strictObject({
  handle: z.string(),
  name: z.string(),
  bio: z.string(),
  avatarUrl: z.url().optional(),
  practiceGoal: practiceGoalSchema.nullable(),
  overall: progressCountsSchema,
  streak: z.strictObject({
    currentDays: z.number().int().min(0),
    lastSolveDate: z.string().nullable(),
  }),
  platforms: z.array(
    z.strictObject({
      slug: problemPlatformSlugSchema,
      name: z.string(),
      total: z.number().int().min(0),
      solved: z.number().int().min(0),
      unsolved: z.number().int().min(0),
    }),
  ),
  practicingSince: z.string(),
  viewerFollows: z.boolean().optional(),
});

export const topicBoardRowSchema = z.strictObject({
  name: z.string(),
  total: z.number().int().min(0),
  solved: z.number().int().min(0),
  unsolved: z.number().int().min(0),
  percentComplete: z.number().int().min(0).max(100),
  isPublic: z.boolean(),
  id: z.uuid().optional(),
});

export const peopleTopicsResponseSchema = z.strictObject({
  items: z.array(topicBoardRowSchema),
});

export const moreListPreviewSchema = z.strictObject({
  topicId: z.uuid(),
  handle: z.string(),
  name: z.string(),
  total: z.number().int().min(0),
  solved: z.number().int().min(0),
});

export const publicTopicHeaderSchema = z.strictObject({
  name: z.string(),
  description: z.string(),
  ownerCompletion: z.strictObject({
    total: z.number().int().min(0),
    solved: z.number().int().min(0),
    unsolved: z.number().int().min(0),
    percentComplete: z.number().int().min(0).max(100),
  }),
  copies30d: z.number().int().min(0),
  difficultyHistogram: z
    .array(z.number().int().min(0))
    .length(DIFFICULTY_HISTOGRAM_BUCKETS),
  moreLists: z.array(moreListPreviewSchema),
});

export const publicProblemRowSchema = z.strictObject({
  title: z.string(),
  url: z.string(),
  platformSlug: problemPlatformSlugSchema,
  platformProblemId: z.string().nullable(),
  difficulty: z.string().nullable(),
  rating: z.number().int().nullable(),
  ownerStatus: problemStatusSchema,
  inViewerLibrary: z.boolean(),
});

export const listPeopleProblemsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  status: problemStatusSchema.optional(),
  platform: z.enum(LIST_PLATFORM_FILTER_SLUGS).optional(),
});

export const peopleProblemsListSchema = paginatedListSchema(publicProblemRowSchema);

export type ListPeopleProblemsQuery = z.infer<typeof listPeopleProblemsQuerySchema>;