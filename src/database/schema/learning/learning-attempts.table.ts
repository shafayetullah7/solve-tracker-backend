import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { learningAttemptStatusEnum } from './learning-attempt-status.enum.js';
import { learningAssessments } from './learning-assessments.table.js';
import { learningAssessmentRevisions } from './learning-assessment-revisions.table.js';
import { learningEnrollments } from './learning-enrollments.table.js';
import { learningGuides } from './learning-guides.table.js';

export const learningAttempts = pgTable(
  'learning_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id').notNull(),
    enrollmentId: uuid('enrollment_id').notNull(),
    assessmentId: uuid('assessment_id').notNull(),
    revisionId: uuid('revision_id').notNull(),
    status: learningAttemptStatusEnum('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    earnedPoints: integer('earned_points'),
    possiblePoints: integer('possible_points'),
    scoreBasisPoints: integer('score_basis_points'),
    revision: bigint('revision', { mode: 'bigint' }).notNull().default(1n),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'learning_attempts_enrollment_fk',
      columns: [t.guideId, t.enrollmentId],
      foreignColumns: [learningEnrollments.guideId, learningEnrollments.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'learning_attempts_guide_assessment_fk',
      columns: [t.guideId, t.assessmentId],
      foreignColumns: [learningAssessments.guideId, learningAssessments.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'learning_attempts_revision_fk',
      columns: [t.guideId, t.assessmentId, t.revisionId],
      foreignColumns: [
        learningAssessmentRevisions.guideId,
        learningAssessmentRevisions.assessmentId,
        learningAssessmentRevisions.id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      name: 'learning_attempts_guide_fk',
      columns: [t.guideId],
      foreignColumns: [learningGuides.id],
    }).onDelete('cascade'),
    uniqueIndex('learning_attempts_active_uniq')
      .on(t.enrollmentId, t.assessmentId)
      .where(sql`${t.status} = 'in_progress'::learning_attempt_status`),
    index('learning_attempts_enrollment_idx').on(t.enrollmentId, t.assessmentId),
    check('learning_attempts_revision_check', sql`${t.revision} > 0`),
    check(
      'learning_attempts_score_check',
      sql`(${t.status} <> 'finalized'::learning_attempt_status) or (${t.scoreBasisPoints} is not null and ${t.possiblePoints} is not null and ${t.possiblePoints} > 0)`,
    ),
  ],
);

export type LearningAttempt = typeof learningAttempts.$inferSelect;
export type NewLearningAttempt = typeof learningAttempts.$inferInsert;