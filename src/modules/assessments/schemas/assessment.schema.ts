import { z } from 'zod';
import { LEARNING_ASSESSMENT_FEEDBACK_POLICIES } from '../../../database/schema/learning/learning-assessment-feedback-policy.enum.js';
import { learningErrorSchema } from '../../learning/schemas/learning-guides.schema.js';
import { ownerQuestionSchema } from './assessment-question.schema.js';

export const assessmentIdSchema = z.uuid();
export const guideIdParamSchema = z.uuid();

export { learningErrorSchema as assessmentErrorSchema };

const titleSchema = z.string().trim().min(1).max(200);

export const createAssessmentSchema = z.strictObject({
  title: titleSchema,
  operationId: z.uuid(),
});

export const patchAssessmentSchema = z.strictObject({
  title: titleSchema.optional(),
  operationId: z.uuid(),
}).refine((input) => input.title !== undefined, {
  message: 'title is required.',
});

export const assessmentResponseSchema = z.strictObject({
  id: z.uuid(),
  guideId: z.uuid(),
  title: z.string(),
  activeRevisionId: z.uuid().nullable(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  draftRevisionId: z.uuid(),
  draftQuestions: z.array(ownerQuestionSchema),
});

export const assessmentListSchema = z.strictObject({
  items: z.array(
    z.strictObject({
      id: z.uuid(),
      title: z.string(),
      activeRevisionId: z.uuid().nullable(),
      questionCount: z.number().int().nonnegative(),
    }),
  ),
});

export const publishAssessmentSchema = z.strictObject({
  passingBasisPoints: z.number().int().min(0).max(10000).default(7000),
  feedbackPolicy: z.enum(LEARNING_ASSESSMENT_FEEDBACK_POLICIES).default('after_submit'),
  operationId: z.uuid(),
});

export const addQuestionOperationSchema = z.strictObject({
  operationId: z.uuid(),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type PatchAssessmentInput = z.infer<typeof patchAssessmentSchema>;
export type PublishAssessmentInput = z.infer<typeof publishAssessmentSchema>;