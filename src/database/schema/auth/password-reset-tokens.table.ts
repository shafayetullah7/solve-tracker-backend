import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from '../users/users.table.js';
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    digest: text('digest').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('password_reset_user_idx').on(t.userId)],
);
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
