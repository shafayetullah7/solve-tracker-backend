import { z } from 'zod';
import {
  LEARNING_BLOCK_TYPES,
  learningBlockType,
  type LearningBlockType,
} from '../../../database/schema/learning/learning-block-type.enum.js';
import { revisionSchema } from './learning-guides.schema.js';
import {
  checklistPayloadSchema,
  codePayloadSchema,
  assessmentPayloadSchema,
  linkPayloadSchema,
  normalizeBlockPayload,
  textPayloadSchema,
} from '../learning-block-payload.js';

const blockTypeSchema = z.enum(LEARNING_BLOCK_TYPES);

const blockInputSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(learningBlockType.Text), payload: textPayloadSchema }),
  z.strictObject({ type: z.literal(learningBlockType.Code), payload: codePayloadSchema }),
  z.strictObject({
    type: z.literal(learningBlockType.Checklist),
    payload: checklistPayloadSchema,
  }),
  z.strictObject({ type: z.literal(learningBlockType.Link), payload: linkPayloadSchema }),
  z.strictObject({
    type: z.literal(learningBlockType.Assessment),
    payload: assessmentPayloadSchema,
  }),
]);

export const replaceNodeContentSchema = z.strictObject({
  expectedContentRevision: revisionSchema,
  operationId: z.uuid(),
  blocks: z.array(blockInputSchema).max(200),
});
export type ReplaceNodeContentInput = z.infer<typeof replaceNodeContentSchema>;

export const blockResponseSchema = z.strictObject({
  id: z.uuid(),
  position: z.number().int().nonnegative(),
  type: blockTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  schemaVersion: z.number().int().positive(),
});
export type BlockResponse = z.infer<typeof blockResponseSchema>;

export const nodeContentResponseSchema = z.strictObject({
  contentRevision: revisionSchema,
  blocks: z.array(blockResponseSchema).max(200),
});
export type NodeContentResponse = z.infer<typeof nodeContentResponseSchema>;

export const nodeCompletionSchema = z.strictObject({
  operationId: z.uuid(),
  complete: z.boolean(),
});
export type NodeCompletionInput = z.infer<typeof nodeCompletionSchema>;

export const progressSummarySchema = z.strictObject({
  completedRequired: z.number().int().nonnegative(),
  totalRequired: z.number().int().nonnegative(),
  percent: z.number().int().min(0).max(100).nullable(),
});
export type ProgressSummary = z.infer<typeof progressSummarySchema>;

export function toBlockResponse(
  row: {
    id: string;
    position: number;
    type: LearningBlockType;
    payload: unknown;
    schemaVersion: number;
  },
): BlockResponse {
  const normalized = normalizeBlockPayload(row.type, row.payload);
  const payload =
    row.type === learningBlockType.Text
      ? { body: (normalized as { body: string }).body }
      : normalized;
  return {
    id: row.id,
    position: row.position,
    type: row.type,
    payload: payload as Record<string, unknown>,
    schemaVersion: row.schemaVersion,
  };
}

export function parseStoredPayload(
  type: typeof learningBlockType.Text | typeof learningBlockType.Code | typeof learningBlockType.Checklist,
  payload: unknown,
) {
  return normalizeBlockPayload(type, payload);
}