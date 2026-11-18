import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../users/users.table.js';
import { problemStatusEnum } from './problem-status.enum.js';

// Display `url` preserves path/query casing; `normalized_url` follows FR-06 (see problem-url.ts).
export const problems = pgTable(
  'problems',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    url: text('url').notNull(),
    normalizedUrl: text('normalized_url').notNull(),
    platformSlug: text('platform_slug').notNull().default('other'),
    platformProblemId: text('platform_problem_id'),
    difficulty: text('difficulty'),
    rating: integer('rating'),
    notes: text('notes'),
    status: problemStatusEnum('status').notNull().default('unsolved'),
    solvedAt: timestamp('solved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('problems_user_normalized_url_uniq').on(
      t.userId,
      t.normalizedUrl,
    ),
    index('problems_user_idx').on(t.userId),
    index('problems_user_platform_slug_idx').on(t.userId, t.platformSlug),
    index('discover_problem_normalized_url_idx').on(t.normalizedUrl),
  ],
);

export type Problem = typeof problems.$inferSelect;
export type NewProblem = typeof problems.$inferInsert;