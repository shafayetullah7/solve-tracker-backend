import { z } from 'zod';
import { revisionSchema, guideTitleSchema } from './learning-guides.schema.js';

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
});
export const treeResponseSchema = z.strictObject({
  structureRevision: revisionSchema,
  nodes: z.array(nodeResponseSchema).max(2000),
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
