import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../users/users.table.js';

export const discoverEvents = pgTable(
  'discover_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    viewerId: uuid('viewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    surface: text('surface').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('discover_events_created_at_idx').on(t.createdAt)],
);

export type DiscoverEvent = typeof discoverEvents.$inferSelect;