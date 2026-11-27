import { pgEnum } from 'drizzle-orm/pg-core';

/** Canonical practice goal values (PostgreSQL enum and profile API). */
export const practiceGoal = {
  Interview: 'interview',
  Contests: 'contests',
  Fundamentals: 'fundamentals',
  Coaching: 'coaching',
} as const;

export const PRACTICE_GOAL_VALUES = [
  practiceGoal.Interview,
  practiceGoal.Contests,
  practiceGoal.Fundamentals,
  practiceGoal.Coaching,
] as const;

export type PracticeGoal = (typeof PRACTICE_GOAL_VALUES)[number];

export const practiceGoalEnum = pgEnum('practice_goal', [...PRACTICE_GOAL_VALUES]);