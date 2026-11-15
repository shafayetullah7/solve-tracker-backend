import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from '../users/users.table.js';
export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshDigest: text('refresh_digest').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('auth_sessions_user_idx').on(t.userId)],
);
export type AuthSession = typeof authSessions.$inferSelect;
