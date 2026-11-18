import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

// Profile scalars on `users` (bio, avatar); `name` is register + session + public profile.
// `handle` is required unique public id (canonical lowercase); see user-handle.schema.ts.
// `avatar_media_id` FK → media.id (ON DELETE SET NULL) belongs in migration SQL; avoid users↔media circular imports.
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    handle: text('handle').notNull(),
    handleChangedAt: timestamp('handle_changed_at', { withTimezone: true }),
    bio: text('bio').notNull().default(''),
    avatarMediaId: uuid('avatar_media_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('users_handle_lower_uniq').on(sql`lower(${t.handle})`),
  ],
);
export type User = typeof users.$inferSelect;