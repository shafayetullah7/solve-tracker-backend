import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../users/users.table.js';

export const learningOperations = pgTable('learning_operations', {
  actorId: uuid('actor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  operationId: uuid('operation_id').notNull(),
  requestHash: text('request_hash').notNull(),
  resourceId: uuid('resource_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.actorId, t.operationId], name: 'learning_operations_pkey' }),
  index('learning_operations_expiry_idx').on(t.expiresAt),
]);

export type LearningOperation = typeof learningOperations.$inferSelect;
