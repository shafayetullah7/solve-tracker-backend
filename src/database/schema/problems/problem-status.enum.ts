import { pgEnum } from 'drizzle-orm/pg-core';

export const problemStatusEnum = pgEnum('problem_status', ['unsolved', 'solved']);