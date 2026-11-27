import { z } from 'zod';
import { PRACTICE_GOAL_VALUES } from '../../database/schema/users/practice-goal.enum.js';
import { PRACTICE_VISIBILITY_VALUES } from '../../database/schema/users/practice-visibility.enum.js';
import { measureCodePoints } from '../unicode.js';

export const TOPIC_DESCRIPTION_MAX = 280;

export const practiceVisibilitySchema = z.enum(PRACTICE_VISIBILITY_VALUES);

export const practiceGoalSchema = z.enum(PRACTICE_GOAL_VALUES);

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

export type { PracticeGoal, PracticeVisibility } from '../../database/schema/users/index.js';