import { z } from 'zod';
import { LEARNING_ATTEMPT_STATUSES } from '../../../database/schema/learning/learning-attempt-status.enum.js';

export const attemptIdSchema = z.uuid();

const saveAnswerResponseSchema = z.union([
  z.strictObject({ selectedOptionId: z.uuid() }),
  z.strictObject({ selectedOptionIds: z.array(z.uuid()) }),
  z.strictObject({ value: z.boolean() }),
  z.strictObject({ valueScaled: z.number().int() }),
  z.null(),
]);

export const saveAnswerSchema = z.strictObject({
  questionId: z.uuid(),
  response: saveAnswerResponseSchema,
  operationId: z.uuid(),
});

export const submitAttemptSchema = z.strictObject({
  operationId: z.uuid(),
});

const learnerQuestionSchema = z.strictObject({
  id: z.uuid(),
  position: z.number().int().nonnegative(),
  kind: z.enum(['single_choice', 'true_false', 'multiple_choice', 'numerical']),
  prompt: z.record(z.string(), z.unknown()),
  points: z.number().int().positive(),
});

export const attemptResponseSchema = z.strictObject({
  id: z.uuid(),
  assessmentId: z.uuid(),
  revisionId: z.uuid(),
  status: z.enum(LEARNING_ATTEMPT_STATUSES),
  startedAt: z.iso.datetime(),
  submittedAt: z.iso.datetime().nullable(),
  finalizedAt: z.iso.datetime().nullable(),
  earnedPoints: z.number().int().nullable(),
  possiblePoints: z.number().int().nullable(),
  scoreBasisPoints: z.number().int().nullable(),
  passingBasisPoints: z.number().int(),
  passed: z.boolean().nullable(),
  questions: z.array(learnerQuestionSchema),
  answers: z.array(
    z.strictObject({
      questionId: z.uuid(),
      response: z.unknown(),
    }),
  ),
});

export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;