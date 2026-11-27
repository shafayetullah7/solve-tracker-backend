import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { learningQuestionKindEnum } from './learning-question-kind.enum.js';
import { learningAssessmentRevisions } from './learning-assessment-revisions.table.js';
import { learningAssessments } from './learning-assessments.table.js';

export const learningQuestions = pgTable(
  'learning_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id').notNull(),
    assessmentId: uuid('assessment_id').notNull(),
    revisionId: uuid('revision_id').notNull(),
    position: integer('position').notNull(),
    kind: learningQuestionKindEnum('kind').notNull(),
    prompt: jsonb('prompt').notNull(),
    gradingConfig: jsonb('grading_config').notNull(),
    points: integer('points').notNull().default(1),
  },
  (t) => [
    foreignKey({
      name: 'learning_questions_revision_fk',
      columns: [t.guideId, t.assessmentId, t.revisionId],
      foreignColumns: [
        learningAssessmentRevisions.guideId,
        learningAssessmentRevisions.assessmentId,
        learningAssessmentRevisions.id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      name: 'learning_questions_assessment_fk',
      columns: [t.guideId, t.assessmentId],
      foreignColumns: [learningAssessments.guideId, learningAssessments.id],
    }).onDelete('cascade'),
    uniqueIndex('learning_questions_revision_position_uniq').on(t.revisionId, t.position),
    uniqueIndex('learning_questions_revision_id_uniq').on(t.revisionId, t.id),
    check('learning_questions_position_check', sql`${t.position} >= 0`),
    check('learning_questions_points_check', sql`${t.points} > 0 and ${t.points} <= 100`),
  ],
);

export type LearningQuestion = typeof learningQuestions.$inferSelect;
export type NewLearningQuestion = typeof learningQuestions.$inferInsert;