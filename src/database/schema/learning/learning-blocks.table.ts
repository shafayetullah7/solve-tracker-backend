import { sql } from 'drizzle-orm';
import { bigint, check, foreignKey, index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { learningBlockTypeEnum } from './learning-block-type.enum.js';
import { learningGuides } from './learning-guides.table.js';
import { learningNodes } from './learning-nodes.table.js';

export {
  LEARNING_BLOCK_TYPES,
  learningBlockTypeEnum,
  type LearningBlockType,
} from './learning-block-type.enum.js';

export const learningBlocks = pgTable(
  'learning_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id').notNull(),
    nodeId: uuid('node_id').notNull(),
    position: integer('position').notNull(),
    type: learningBlockTypeEnum('type').notNull(),
    payload: jsonb('payload').notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    activityRevision: bigint('activity_revision', { mode: 'bigint' }).notNull().default(1n),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'learning_blocks_node_fk',
      columns: [t.guideId, t.nodeId],
      foreignColumns: [learningNodes.guideId, learningNodes.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'learning_blocks_guide_fk',
      columns: [t.guideId],
      foreignColumns: [learningGuides.id],
    }).onDelete('cascade'),
    uniqueIndex('learning_blocks_guide_id_uniq').on(t.guideId, t.id),
    uniqueIndex('learning_blocks_node_position_uniq').on(t.guideId, t.nodeId, t.position),
    index('learning_blocks_node_idx').on(t.guideId, t.nodeId),
    check('learning_blocks_position_check', sql`${t.position} >= 0`),
    check('learning_blocks_schema_version_check', sql`${t.schemaVersion} > 0`),
    check('learning_blocks_activity_revision_check', sql`${t.activityRevision} > 0`),
  ],
);

export type LearningBlock = typeof learningBlocks.$inferSelect;
export type NewLearningBlock = typeof learningBlocks.$inferInsert;