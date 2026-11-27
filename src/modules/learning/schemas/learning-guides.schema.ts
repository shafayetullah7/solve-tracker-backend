import { z } from 'zod';
import { paginatedListSchema } from '../../../common/pagination.schema.js';

export const guideIdSchema = z.uuid();
export const revisionSchema = z.string().regex(/^[1-9][0-9]{0,18}$/).refine(
  (value) => BigInt(value) <= 9223372036854775807n,
  'Revision exceeds the supported range.',
);
export const guideTitleSchema = z.string().trim().min(1).max(200);
export const guideDescriptionSchema = z.string().max(10000);

export const createGuideSchema = z.strictObject({
  title: guideTitleSchema,
  description: guideDescriptionSchema.default(''),
  operationId: z.uuid(),
});

export const patchGuideSchema = z.strictObject({
  title: guideTitleSchema.optional(),
  description: guideDescriptionSchema.optional(),
  expectedMetadataRevision: revisionSchema,
  operationId: z.uuid(),
}).refine((value) => value.title !== undefined || value.description !== undefined, {
  message: 'At least one editable field is required.',
});

export const listGuidesQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['active', 'archived']).default('active'),
  search: z.string().trim().max(200).optional(),
});

export const guideResponseSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  structureRevision: revisionSchema,
  metadataRevision: revisionSchema,
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const guideListResponseSchema = paginatedListSchema(guideResponseSchema);
export const learningErrorSchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type CreateGuideInput = z.infer<typeof createGuideSchema>;
export type PatchGuideInput = z.infer<typeof patchGuideSchema>;
export type ListGuidesQuery = z.infer<typeof listGuidesQuerySchema>;
export type GuideResponse = z.infer<typeof guideResponseSchema>;
