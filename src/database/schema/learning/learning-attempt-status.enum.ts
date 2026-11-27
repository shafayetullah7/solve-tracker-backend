import { pgEnum } from 'drizzle-orm/pg-core';

export const learningAttemptStatus = {
  InProgress: 'in_progress',
  Finalized: 'finalized',
} as const;

export const LEARNING_ATTEMPT_STATUSES = [
  learningAttemptStatus.InProgress,
  learningAttemptStatus.Finalized,
] as const;

export type LearningAttemptStatus = (typeof LEARNING_ATTEMPT_STATUSES)[number];

export const learningAttemptStatusEnum = pgEnum(
  'learning_attempt_status',
  [...LEARNING_ATTEMPT_STATUSES],
);