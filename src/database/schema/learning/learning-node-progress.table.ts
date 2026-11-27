import { foreignKey, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { learningEnrollments } from './learning-enrollments.table.js';
import { learningNodes } from './learning-nodes.table.js';

export const learningNodeProgress = pgTable(
  'learning_node_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id').notNull(),
    guideId: uuid('guide_id').notNull(),
    nodeId: uuid('node_id').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'learning_node_progress_enrollment_fk',
      columns: [t.guideId, t.enrollmentId],
      foreignColumns: [learningEnrollments.guideId, learningEnrollments.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'learning_node_progress_node_fk',
      columns: [t.guideId, t.nodeId],
      foreignColumns: [learningNodes.guideId, learningNodes.id],
    }).onDelete('cascade'),
    uniqueIndex('learning_node_progress_enrollment_node_uniq').on(t.enrollmentId, t.nodeId),
    uniqueIndex('learning_node_progress_guide_id_uniq').on(t.guideId, t.id),
  ],
);

export type LearningNodeProgress = typeof learningNodeProgress.$inferSelect;
export type NewLearningNodeProgress = typeof learningNodeProgress.$inferInsert;