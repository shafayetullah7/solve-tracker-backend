import { z } from 'zod';
import { measureCodePoints } from '../unicode.js';

export const TOPIC_DESCRIPTION_MAX = 280;

export const practiceVisibilitySchema = z.enum(['private', 'summary', 'topics']);

export const practiceGoalSchema = z.enum([
  'interview',
  'contests',
  'fundamentals',
  'coaching',
]);

/** PATCH: set goal or clear with `null`. */
export const practiceGoalPatchSchema = z.union([practiceGoalSchema, z.null()]);

const CONTROL_CHAR = /[\u0000-\u001F\u007F]/;

export const topicDescriptionSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => !CONTROL_CHAR.test(value), {
    message: 'Description must not contain control characters.',
  })
  .refine((value) => measureCodePoints(value) <= TOPIC_DESCRIPTION_MAX, {
    message: `Description must contain at most ${TOPIC_DESCRIPTION_MAX} characters.`,
  });

export type PracticeVisibility = z.infer<typeof practiceVisibilitySchema>;
export type PracticeGoal = z.infer<typeof practiceGoalSchema>;