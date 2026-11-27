import { z } from 'zod';
import { R1_OBJECTIVE_QUESTION_KINDS } from '../../../database/schema/learning/learning-question-kind.enum.js';

const optionSchema = z.strictObject({
  id: z.uuid(),
  label: z.string().min(1).max(500),
});

export const singleChoiceGradingSchema = z.strictObject({
  correctOptionId: z.uuid(),
});

export const trueFalseGradingSchema = z.strictObject({
  correctValue: z.boolean(),
});

export const multipleChoiceGradingSchema = z.strictObject({
  correctOptionIds: z.array(z.uuid()).min(1).max(20),
});

export const numericalGradingSchema = z.strictObject({
  correctValueScaled: z.number().int(),
  toleranceScaled: z.number().int().nonnegative().default(0),
});

export const addQuestionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('single_choice'),
    prompt: z.strictObject({
      stem: z.string().min(1).max(4000),
      options: z.array(optionSchema).min(2).max(20),
    }),
    gradingConfig: singleChoiceGradingSchema,
    points: z.number().int().min(1).max(100).default(1),
  }),
  z.strictObject({
    kind: z.literal('true_false'),
    prompt: z.strictObject({
      stem: z.string().min(1).max(4000),
    }),
    gradingConfig: trueFalseGradingSchema,
    points: z.number().int().min(1).max(100).default(1),
  }),
  z.strictObject({
    kind: z.literal('multiple_choice'),
    prompt: z.strictObject({
      stem: z.string().min(1).max(4000),
      options: z.array(optionSchema).min(2).max(20),
    }),
    gradingConfig: multipleChoiceGradingSchema,
    points: z.number().int().min(1).max(100).default(1),
  }),
  z.strictObject({
    kind: z.literal('numerical'),
    prompt: z.strictObject({
      stem: z.string().min(1).max(4000),
      unit: z.string().max(64).optional(),
    }),
    gradingConfig: numericalGradingSchema,
    points: z.number().int().min(1).max(100).default(1),
  }),
]);

export type AddQuestionInput = z.infer<typeof addQuestionSchema>;

export const ownerQuestionSchema = z.strictObject({
  id: z.uuid(),
  position: z.number().int().nonnegative(),
  kind: z.enum(R1_OBJECTIVE_QUESTION_KINDS),
  prompt: z.record(z.string(), z.unknown()),
  gradingConfig: z.record(z.string(), z.unknown()),
  points: z.number().int().positive(),
});
