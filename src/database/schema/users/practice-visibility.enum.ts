import { pgEnum } from 'drizzle-orm/pg-core';

/** Canonical practice visibility values (PostgreSQL enum and discover API). */
export const practiceVisibility = {
  Private: 'private',
  Summary: 'summary',
  Topics: 'topics',
} as const;

export const PRACTICE_VISIBILITY_VALUES = [
  practiceVisibility.Private,
  practiceVisibility.Summary,
  practiceVisibility.Topics,
] as const;

export type PracticeVisibility = (typeof PRACTICE_VISIBILITY_VALUES)[number];

export const practiceVisibilityEnum = pgEnum(
  'practice_visibility',
  [...PRACTICE_VISIBILITY_VALUES],
);