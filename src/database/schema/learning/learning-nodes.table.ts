import { sql } from 'drizzle-orm';
import { bigint, boolean, check, foreignKey, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { learningGuides } from './learning-guides.table.js';

export const learningNodes = pgTable(
  'learning_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id').notNull().references(() => learningGuides.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    title: text('title').notNull(),
    position: integer('position').notNull(),
    required: boolean('required').notNull().default(true),
    completionMode: text('completion_mode', { enum: ['structural', 'manual', 'gated'] }).notNull().default('structural'),
    contentRevision: bigint('content_revision', { mode: 'bigint' }).notNull().default(1n),
    requirementRevision: bigint('requirement_revision', { mode: 'bigint' }).notNull().default(1n),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletionBatchId: uuid('deletion_batch_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('learning_nodes_guide_id_uniq').on(t.guideId, t.id),
    foreignKey({ name: 'learning_nodes_parent_fk', columns: [t.guideId, t.parentId], foreignColumns: [t.guideId, t.id] }),
    uniqueIndex('learning_nodes_root_position_uniq').on(t.guideId, t.position).where(sql`${t.parentId} is null and ${t.deletedAt} is null`),
    uniqueIndex('learning_nodes_child_position_uniq').on(t.guideId, t.parentId, t.position).where(sql`${t.parentId} is not null and ${t.deletedAt} is null`),
    index('learning_nodes_parent_idx').on(t.guideId, t.parentId),
    index('learning_nodes_deletion_batch_idx').on(t.guideId, t.deletionBatchId),
    check('learning_nodes_parent_check', sql`${t.parentId} is null or ${t.parentId} <> ${t.id}`),
    check('learning_nodes_position_check', sql`${t.position} >= 0`),
    check('learning_nodes_title_check', sql`length(btrim(${t.title})) > 0`),
    check('learning_nodes_mode_check', sql`${t.completionMode} in ('structural', 'manual', 'gated')`),
    check('learning_nodes_revisions_check', sql`${t.contentRevision} > 0 and ${t.requirementRevision} > 0`),
    check('learning_nodes_deletion_check', sql`(${t.deletedAt} is null) = (${t.deletionBatchId} is null)`),
  ],
);

export type LearningNode = typeof learningNodes.$inferSelect;
export type NewLearningNode = typeof learningNodes.$inferInsert;
