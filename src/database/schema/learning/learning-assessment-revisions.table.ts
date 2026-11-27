import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { learningAssessmentFeedbackPolicyEnum } from './learning-assessment-feedback-policy.enum.js';
import { learningAssessments } from './learning-assessments.table.js';
import { learningGuides } from './learning-guides.table.js';

export const DRAFT_REVISION_NUMBER = 0;

export const learningAssessmentRevisions = pgTable(
  'learning_assessment_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id').notNull(),
    assessmentId: uuid('assessment_id').notNull(),
    revisionNumber: integer('revision_number').notNull(),
    passingBasisPoints: integer('passing_basis_points').notNull().default(7000),
    gradingPolicyVersion: integer('grading_policy_version').notNull().default(1),
    feedbackPolicy: learningAssessmentFeedbackPolicyEnum('feedback_policy')
      .notNull()
      .default('after_submit'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'learning_assessment_revisions_guide_assessment_fk',
      columns: [t.guideId, t.assessmentId],
      foreignColumns: [learningAssessments.guideId, learningAssessments.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'learning_assessment_revisions_guide_fk',
      columns: [t.guideId],
      foreignColumns: [learningGuides.id],
    }).onDelete('cascade'),
    uniqueIndex('learning_assessment_revisions_assessment_rev_uniq').on(
      t.assessmentId,
      t.revisionNumber,
    ),
    uniqueIndex('learning_assessment_revisions_guide_rev_uniq').on(
      t.guideId,
      t.assessmentId,
      t.id,
    ),
    index('learning_assessment_revisions_assessment_idx').on(t.assessmentId),
    check('learning_assessment_revisions_number_check', sql`${t.revisionNumber} >= 0`),
    check(
      'learning_assessment_revisions_passing_check',
      sql`${t.passingBasisPoints} >= 0 and ${t.passingBasisPoints} <= 10000`,
    ),
    check('learning_assessment_revisions_policy_check', sql`${t.gradingPolicyVersion} > 0`),
  ],
);

export type LearningAssessmentRevision = typeof learningAssessmentRevisions.$inferSelect;
export type NewLearningAssessmentRevision = typeof learningAssessmentRevisions.$inferInsert;