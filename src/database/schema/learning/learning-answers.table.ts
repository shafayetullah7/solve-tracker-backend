import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { learningAttempts } from './learning-attempts.table.js';
import { learningQuestions } from './learning-questions.table.js';

export const learningAnswers = pgTable(
  'learning_answers',
  {
    attemptId: uuid('attempt_id').notNull(),
    questionId: uuid('question_id').notNull(),
    revisionId: uuid('revision_id').notNull(),
    response: jsonb('response').notNull(),
    awardedPoints: integer('awarded_points'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'learning_answers_pkey', columns: [t.attemptId, t.questionId] }),
    foreignKey({
      name: 'learning_answers_attempt_fk',
      columns: [t.attemptId],
      foreignColumns: [learningAttempts.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'learning_answers_question_fk',
      columns: [t.revisionId, t.questionId],
      foreignColumns: [learningQuestions.revisionId, learningQuestions.id],
    }).onDelete('cascade'),
    check(
      'learning_answers_points_check',
      sql`${t.awardedPoints} is null or (${t.awardedPoints} >= 0 and ${t.awardedPoints} <= 100)`,
    ),
  ],
);

export type LearningAnswer = typeof learningAnswers.$inferSelect;