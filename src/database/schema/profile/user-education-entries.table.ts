import { index, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../users/users.table.js';

export const userEducationEntries = pgTable(
  'user_education_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    institution: text('institution').notNull(),
    program: text('program').notNull(),
    endYear: text('end_year'),
    sortOrder: smallint('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('user_education_entries_user_idx').on(t.userId)],
);

export type UserEducationEntry = typeof userEducationEntries.$inferSelect;
export type NewUserEducationEntry = typeof userEducationEntries.$inferInsert;