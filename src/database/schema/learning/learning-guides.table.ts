import { sql } from 'drizzle-orm';
import { bigint, check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from '../users/users.table.js';

export const learningGuides = pgTable(
  'learning_guides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    structureRevision: bigint('structure_revision', { mode: 'bigint' }).notNull().default(1n),
    metadataRevision: bigint('metadata_revision', { mode: 'bigint' }).notNull().default(1n),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('learning_guides_id_owner_uniq').on(t.id, t.ownerId),
    index('learning_guides_owner_status_updated_idx').on(t.ownerId, t.deletedAt, t.archivedAt, t.updatedAt, t.id),
    check('learning_guides_title_check', sql`length(btrim(${t.title})) > 0`),
    check('learning_guides_revisions_check', sql`${t.structureRevision} > 0 and ${t.metadataRevision} > 0`),
  ],
);

export type LearningGuide = typeof learningGuides.$inferSelect;
export type NewLearningGuide = typeof learningGuides.$inferInsert;
