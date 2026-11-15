import { pgTable, text } from 'drizzle-orm/pg-core';

export const platforms = pgTable('platforms', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
});

export type Platform = typeof platforms.$inferSelect;
export type NewPlatform = typeof platforms.$inferInsert;
