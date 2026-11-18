import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../users/users.table.js';

// Display `name` keeps the owner's chosen casing after trim.
// `normalized_name` is trim(name).toLocaleLowerCase('en-US') for per-owner uniqueness (see topic-name.ts).
export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    isPublic: boolean('is_public').notNull().default(false),
    description: text('description').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('topics_user_normalized_name_uniq').on(
      t.userId,
      t.normalizedName,
    ),
    index('topics_user_idx').on(t.userId),
    index('discover_public_topic_name_idx')
      .on(t.normalizedName)
      .where(sql`${t.isPublic} = true`),
    check(
      'topics_description_len',
      sql`char_length(${t.description}) <= 280`,
    ),
  ],
);

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;