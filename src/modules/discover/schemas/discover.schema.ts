import { z } from 'zod';
import { practiceGoalSchema } from '../../../common/schemas/practice-discovery.schema.js';
import { paginatedListSchema } from '../../../common/pagination.schema.js';
import { problemPlatformSlugSchema } from '../../problems/schemas/problems.schema.js';
import { errorSchema } from './people.schema.js';

export { errorSchema };

const reasonSchema = z.strictObject({
  kind: z.enum([
    'shared_topics_platforms_cadence',
    'ahead_in_shared_topics',
    'same_goal',
    'consistent_cadence',
    'active_this_week',
    'topic_specialist',
    'list_card',
    'in_n_lists',
    'following',
  ]),
  text: z.string(),
  sharedTopics: z.array(z.string()).optional(),
});

export const personCardSchema = z.strictObject({
  handle: z.string(),
  name: z.string(),
  avatarUrl: z.url().optional(),
  practiceGoal: practiceGoalSchema.nullable(),
  solved: z.number().int().min(0),
  streakDays: z.number().int().min(0),
  platforms: z.array(problemPlatformSlugSchema),
  reason: reasonSchema,
});

export const discoverRailSchema = z.strictObject({
  kind: z.enum(['peers', 'ahead', 'same_goal', 'consistent', 'active_week']),
  people: z.array(personCardSchema),
});

export const starterListCardSchema = z.strictObject({
  handle: z.string(),
  name: z.string(),
  total: z.number().int().min(0),
  topicId: z.uuid(),
  isStarter: z.literal(true),
});

export const yourTopicChipSchema = z.strictObject({
  name: z.string(),
  normalizedName: z.string(),
  listCount: z.number().int().min(0),
});

export const patternItemSchema = z.strictObject({
  normalizedName: z.string(),
  name: z.string(),
  percent: z.number().int().min(0).max(100),
});

export const goalPatternSchema = z.strictObject({
  goal: practiceGoalSchema,
  items: z.array(patternItemSchema),
});

export const forYouResponseSchema = z.strictObject({
  rails: z.array(discoverRailSchema),
  goalPattern: goalPatternSchema.nullable(),
  yourTopics: z.array(yourTopicChipSchema),
  starterLists: z.array(starterListCardSchema),
});

export const topicDirectoryRowSchema = z.strictObject({
  name: z.string(),
  normalizedName: z.string(),
  practicerCount: z.number().int().min(0),
  publicListCount: z.number().int().min(0),
});

export const topicsDirectoryResponseSchema = z.strictObject({
  yourTopics: z.array(topicDirectoryRowSchema),
  popularTopics: z.array(topicDirectoryRowSchema),
});

export const discoverListCardSchema = z.strictObject({
  topicId: z.uuid(),
  handle: z.string(),
  name: z.string(),
  total: z.number().int().min(0),
  solved: z.number().int().min(0),
  copies30d: z.number().int().min(0),
  reason: reasonSchema,
});

export const topicHubSpecialistsRailSchema = z.strictObject({
  kind: z.literal('topic_specialists'),
  people: z.array(personCardSchema),
});

export const topicHubResponseSchema = z.strictObject({
  topicKey: z.string(),
  name: z.string(),
  normalizedName: z.string(),
  header: z.strictObject({
    practicerCount: z.number().int().min(0),
    publicListCount: z.number().int().min(0),
  }),
  viewerTopic: z.union([
    z.strictObject({
      hasTopic: z.literal(true),
      topicId: z.uuid(),
      isPublic: z.boolean(),
    }),
    z.strictObject({ hasTopic: z.literal(false) }),
  ]),
  lists: z.array(discoverListCardSchema),
  pattern: z.strictObject({ items: z.array(patternItemSchema) }).nullable(),
  specialists: topicHubSpecialistsRailSchema.nullable(),
});

export const hubListsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
});

export const hubListsResponseSchema = paginatedListSchema(discoverListCardSchema);

export const hubProblemsQuerySchema = z.strictObject({
  excludeMine: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const hubProblemRowSchema = z.strictObject({
  title: z.string(),
  platformSlug: problemPlatformSlugSchema,
  difficulty: z.string().nullable(),
  listCount: z.number().int().min(0),
  normalizedUrl: z.string(),
  reason: reasonSchema,
});

export const hubProblemsResponseSchema = z.strictObject({
  items: z.array(hubProblemRowSchema),
});

export const topicHintRowSchema = z.strictObject({
  topicId: z.uuid(),
  topicName: z.string(),
  topicKey: z.string(),
  practicerCount: z.number().int().min(0),
  publicListCount: z.number().int().min(0),
});

export const topicHintsResponseSchema = z.strictObject({
  items: z.array(topicHintRowSchema),
});

export const problemCommunityResponseSchema = z.strictObject({
  listCount: z.number().int().min(0),
  title: z.string().optional(),
  platformSlug: problemPlatformSlugSchema.optional(),
});

export const searchQuerySchema = z.strictObject({
  q: z.string().min(2),
  limit: z.coerce.number().int().min(1).max(10).default(10),
});

export const searchResponseSchema = z.strictObject({
  items: z.array(personCardSchema),
});

export const peopleListQuerySchema = z.strictObject({
  rail: z
    .enum([
      'peers',
      'ahead',
      'same_goal',
      'consistent',
      'active_week',
      'following',
    ])
    .optional(),
  goal: practiceGoalSchema.optional(),
  platform: problemPlatformSlugSchema.optional(),
  topic: z.string().optional(),
  active: z
    .enum(['true'])
    .optional()
    .transform((v) => v === 'true'),
  page: z.coerce.number().int().min(1).default(1),
});

export const peopleListResponseSchema = paginatedListSchema(personCardSchema);

export const similarQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(8).default(8),
});

export const similarResponseSchema = z.strictObject({
  items: z.array(personCardSchema),
});

export const discoverEventItemSchema = z.strictObject({
  event: z.string(),
  surface: z.string(),
});

export const discoverEventsBodySchema = z.strictObject({
  events: z.array(discoverEventItemSchema).min(1).max(20),
});

export const discoverEventsResponseSchema = z.strictObject({
  accepted: z.number().int().min(0),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type PeopleListQuery = z.infer<typeof peopleListQuerySchema>;
export type SimilarQuery = z.infer<typeof similarQuerySchema>;
export type DiscoverEventsBody = z.infer<typeof discoverEventsBodySchema>;
export type HubListsQuery = z.infer<typeof hubListsQuerySchema>;
export type HubProblemsQuery = z.infer<typeof hubProblemsQuerySchema>;