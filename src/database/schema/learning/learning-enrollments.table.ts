import { foreignKey, index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { learningGuides } from './learning-guides.table.js';
import { learningNodes } from './learning-nodes.table.js';

export const learningEnrollments = pgTable(
  'learning_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id').notNull(),
    learnerId: uuid('learner_id').notNull(),
    resumeNodeId: uuid('resume_node_id'),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // R1 is owner-only. Public enrollment will require a deliberate schema change.
    foreignKey({ name: 'learning_enrollments_owner_fk', columns: [t.guideId, t.learnerId], foreignColumns: [learningGuides.id, learningGuides.ownerId] }).onDelete('cascade'),
    foreignKey({ name: 'learning_enrollments_resume_fk', columns: [t.guideId, t.resumeNodeId], foreignColumns: [learningNodes.guideId, learningNodes.id] }),
    uniqueIndex('learning_enrollments_guide_learner_uniq').on(t.guideId, t.learnerId),
    uniqueIndex('learning_enrollments_guide_id_uniq').on(t.guideId, t.id),
    index('learning_enrollments_learner_activity_idx').on(t.learnerId, t.lastActivityAt, t.id),
  ],
);

export type LearningEnrollment = typeof learningEnrollments.$inferSelect;
export type NewLearningEnrollment = typeof learningEnrollments.$inferInsert;
