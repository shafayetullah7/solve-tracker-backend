import { pgEnum } from 'drizzle-orm/pg-core';

/** Canonical problem completion status (PostgreSQL enum and problems API). */
export const problemStatus = {
  Unsolved: 'unsolved',
  Solved: 'solved',
} as const;

export const PROBLEM_STATUSES = [
  problemStatus.Unsolved,
  problemStatus.Solved,
] as const;

export type ProblemStatus = (typeof PROBLEM_STATUSES)[number];

export const problemStatusEnum = pgEnum('problem_status', [...PROBLEM_STATUSES]);