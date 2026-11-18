import { sql } from 'drizzle-orm';
import { check, date, integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';

export const discoverDailyCounters = pgTable(
  'discover_daily_counters',
  {
    subjectType: text('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(),
    day: date('day', { mode: 'date' }).notNull(),
    views: integer('views').notNull().default(0),
    copies: integer('copies').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.subjectType, t.subjectId, t.day] }),
    check('discover_daily_counters_views_nonneg', sql`${t.views} >= 0`),
    check('discover_daily_counters_copies_nonneg', sql`${t.copies} >= 0`),
  ],
);

export type DiscoverDailyCounter = typeof discoverDailyCounters.$inferSelect;