import { check, index, jsonb, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../users/users.table.js';
import { mediaResourceTypeEnum } from './media-resource-type.enum.js';

// Slots: usage_count + users.avatar_media_id (MEDIA_CONVENTIONS.md).
// URL is derived from provider, public_id, resource_type, and extension — not stored.
export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    usageCount: smallint('usage_count').notNull().default(0),
    provider: text('provider').notNull().default('cloudinary'),
    publicId: text('public_id').notNull(),
    resourceType: mediaResourceTypeEnum('resource_type').notNull().default('image'),
    extension: text('extension').notNull(),
    meta: jsonb('meta').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('media_user_idx').on(t.userId),
    index('media_user_usage_idx').on(t.userId, t.usageCount),
    check(
      'media_usage_count_range',
      sql`${t.usageCount} >= 0 AND ${t.usageCount} <= 2`,
    ),
  ],
);

export type MediaRecord = typeof media.$inferSelect;
export type NewMediaRecord = typeof media.$inferInsert;