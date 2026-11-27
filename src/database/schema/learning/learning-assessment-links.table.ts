import { foreignKey, pgTable, uuid } from 'drizzle-orm/pg-core';
import { learningAssessments } from './learning-assessments.table.js';
import { learningBlocks } from './learning-blocks.table.js';
import { learningGuides } from './learning-guides.table.js';

export const learningAssessmentLinks = pgTable(
  'learning_assessment_links',
  {
    blockId: uuid('block_id').primaryKey(),
    guideId: uuid('guide_id').notNull(),
    assessmentId: uuid('assessment_id').notNull(),
  },
  (t) => [
    foreignKey({
      name: 'learning_assessment_links_block_fk',
      columns: [t.guideId, t.blockId],
      foreignColumns: [learningBlocks.guideId, learningBlocks.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'learning_assessment_links_assessment_fk',
      columns: [t.guideId, t.assessmentId],
      foreignColumns: [learningAssessments.guideId, learningAssessments.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'learning_assessment_links_guide_fk',
      columns: [t.guideId],
      foreignColumns: [learningGuides.id],
    }).onDelete('cascade'),
  ],
);

export type LearningAssessmentLink = typeof learningAssessmentLinks.$inferSelect;