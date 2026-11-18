import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../users/users.table.js';

export const riscEventReceipts = pgTable(
  'risc_event_receipts',
  {
    jti: text('jti').primaryKey(),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    eventTypes: jsonb('event_types').$type<string[]>().notNull(),
    providerSubject: text('provider_subject'),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [index('risc_event_receipts_received_at_idx').on(t.receivedAt)],
);

export type RiscEventReceipt = typeof riscEventReceipts.$inferSelect;
export type NewRiscEventReceipt = typeof riscEventReceipts.$inferInsert;