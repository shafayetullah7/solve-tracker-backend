import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { learningGuides } from './learning-guides.table.js';

export const learningAssessments = pgTable(
  'learning_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => learningGuides.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    activeRevisionId: uuid('active_revision_id'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('learning_assessments_guide_id_uniq').on(t.guideId, t.id),
    index('learning_assessments_guide_idx').on(t.guideId),
    check('learning_assessments_title_check', sql`length(btrim(${t.title})) > 0`),
  ],
);

export type LearningAssessment = typeof learningAssessments.$inferSelect;
export type NewLearningAssessment = typeof learningAssessments.$inferInsert;