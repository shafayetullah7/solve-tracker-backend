import { z } from 'zod';
import { measureCodePoints } from '../../../common/unicode.js';
import { paginatedListSchema } from '../../../common/pagination.schema.js';
import { errorSchema } from '../../topics/schemas/topics.schema.js';
import { uuidQueryArraySchema } from '../../../common/query-arrays.js';
import { PLATFORM_SLUGS } from '../problem-platform-filter.js';
import {
  PROBLEM_DIFFICULTY_MAX,
  PROBLEM_NOTES_MAX,
  PROBLEM_PLATFORM_ID_MAX,
  PROBLEM_RATING_MAX,
  PROBLEM_RATING_MIN,
} from '../problem-fields.js';

const LIST_SEARCH_MAX = 200;

export { errorSchema };

function optionalCodePointString(max: number) {
  return z
    .string()
    .refine(
      (value) => measureCodePoints(value) <= max,
      `At most ${max} characters.`,
    );
}

export const problemStatusSchema = z.enum(['unsolved', 'solved']);

export const listProblemsQuerySchema = z
  .strictObject({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    q: z
      .string()
      .max(LIST_SEARCH_MAX)
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }),
    status: problemStatusSchema.optional(),
    platform: z.enum(PLATFORM_SLUGS).optional(),
    topicIds: uuidQueryArraySchema().describe(
      'Filter to problems linked to any of these owned topics.',
    ),
    topicId: z.uuid().optional(),
    untagged: z
      .enum(['true'])
      .optional()
      .transform((value) => (value === undefined ? undefined : true)),
    sort: z.enum(['title', 'createdAt', 'solvedAt']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine(
    (query) =>
      !query.untagged ||
      (!query.topicId && (query.topicIds === undefined || query.topicIds.length === 0)),
    {
      message: 'Cannot combine untagged filter with topic filters.',
      path: ['untagged'],
    },
  );

export const problemIdParamSchema = z.uuid();

const topicIdsSchema = z.array(z.uuid()).default([]);

export const createProblemSchema = z.strictObject({
  title: z.string(),
  url: z.string(),
  topicIds: topicIdsSchema,
  platformProblemId: optionalCodePointString(PROBLEM_PLATFORM_ID_MAX).optional(),
  difficulty: optionalCodePointString(PROBLEM_DIFFICULTY_MAX).optional(),
  rating: z
    .number()
    .int()
    .min(PROBLEM_RATING_MIN)
    .max(PROBLEM_RATING_MAX)
    .optional(),
  notes: optionalCodePointString(PROBLEM_NOTES_MAX).optional(),
  status: problemStatusSchema.default('unsolved'),
});

export const updateProblemSchema = z
  .strictObject({
    title: z.string().optional(),
    url: z.string().optional(),
    topicIds: z.array(z.uuid()).optional(),
    platformProblemId: optionalCodePointString(PROBLEM_PLATFORM_ID_MAX)
      .nullable()
      .optional(),
    difficulty: optionalCodePointString(PROBLEM_DIFFICULTY_MAX)
      .nullable()
      .optional(),
    rating: z
      .number()
      .int()
      .min(PROBLEM_RATING_MIN)
      .max(PROBLEM_RATING_MAX)
      .nullable()
      .optional(),
    notes: optionalCodePointString(PROBLEM_NOTES_MAX).nullable().optional(),
    status: problemStatusSchema.optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    'At least one field is required.',
  );

export const problemTopicSummarySchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
});

export const problemResponseSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  url: z.string(),
  platformProblemId: z.string().nullable(),
  difficulty: z.string().nullable(),
  rating: z.number().int().nullable(),
  notes: z.string().nullable(),
  status: problemStatusSchema,
  solvedAt: z.iso.datetime().nullable(),
  topics: z.array(problemTopicSummarySchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const problemListResponseSchema = paginatedListSchema(problemResponseSchema);

export type ListProblemsQuery = z.infer<typeof listProblemsQuerySchema>;
export type CreateProblemInput = z.infer<typeof createProblemSchema>;
export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;