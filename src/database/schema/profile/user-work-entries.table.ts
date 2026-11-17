import { index, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../users/users.table.js';

export const userWorkEntries = pgTable(
  'user_work_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organization: text('organization').notNull(),
    role: text('role').notNull(),
    period: text('period'),
    sortOrder: smallint('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('user_work_entries_user_idx').on(t.userId)],
);

export type UserWorkEntry = typeof userWorkEntries.$inferSelect;
export type NewUserWorkEntry = typeof userWorkEntries.$inferInsert;