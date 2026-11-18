import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Profile scalars on `users` (bio, avatar); `name` is register + session + public profile.
// `avatar_media_id` FK → media.id (ON DELETE SET NULL) belongs in migration SQL; avoid users↔media circular imports.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  bio: text('bio').notNull().default(''),
  avatarMediaId: uuid('avatar_media_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type User = typeof users.$inferSelect;