import { z } from 'zod';
import { revisionSchema, guideTitleSchema } from './learning-guides.schema.js';
import { progressSummarySchema } from './learning-blocks.schema.js';

const placement = {
  parentId: z.uuid().nullable(),
  beforeNodeId: z.uuid().nullable(),
  expectedStructureRevision: revisionSchema,
  operationId: z.uuid(),
};

export const createNodeSchema = z.strictObject({
  ...placement,
  title: guideTitleSchema,
  required: z.boolean().default(true),
  completionMode: z.enum(['structural', 'manual']).default('structural'),
});
export const moveNodeSchema = z.strictObject(placement);
export const nodeResponseSchema = z.strictObject({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
  title: z.string(),
  position: z.number().int().nonnegative(),
  required: z.boolean(),
  completionMode: z.enum(['structural', 'manual', 'gated']),
  contentRevision: revisionSchema,
  requirementRevision: revisionSchema,
  completed: z.boolean(),
});
export const treeResponseSchema = z.strictObject({
  structureRevision: revisionSchema,
  nodes: z.array(nodeResponseSchema).max(2000),
  progress: progressSummarySchema,
});
export type CreateNodeInput = z.infer<typeof createNodeSchema>;
export type MoveNodeInput = z.infer<typeof moveNodeSchema>;
export type NodeResponse = z.infer<typeof nodeResponseSchema>;
export type TreeResponse = z.infer<typeof treeResponseSchema>;

export const patchNodeSchema = z.strictObject({
  title: guideTitleSchema.optional(),
  required: z.boolean().optional(),
  completionMode: z.enum(['structural', 'manual']).optional(),
  expectedStructureRevision: revisionSchema,
  operationId: z.uuid(),
}).refine(input => input.title !== undefined || input.required !== undefined || input.completionMode !== undefined, {
  message: 'At least one metadata field is required.',
});
export type PatchNodeInput = z.infer<typeof patchNodeSchema>;

export const recoveryQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export const recoveryResponseSchema = z.strictObject({
  items: z.array(z.strictObject({
    id: z.uuid(), title: z.string(), parentId: z.uuid().nullable(),
    deletedAt: z.iso.datetime(), expiresAt: z.iso.datetime(),
  })),
  page: z.number().int(), pageSize: z.number().int(), hasMore: z.boolean(),
});
export type RecoveryQuery = z.infer<typeof recoveryQuerySchema>;
export type RecoveryResponse = z.infer<typeof recoveryResponseSchema>;

export const enrollmentResponseSchema = z.strictObject({
  id: z.uuid(), guideId: z.uuid(), resumeNodeId: z.uuid().nullable(),
  lastActivityAt: z.iso.datetime().nullable(),
});
export const resumeSchema = z.strictObject({
  nodeId: z.uuid().nullable(), expectedStructureRevision: revisionSchema, operationId: z.uuid(),
});
export type EnrollmentResponse = z.infer<typeof enrollmentResponseSchema>;
export type ResumeInput = z.infer<typeof resumeSchema>;
