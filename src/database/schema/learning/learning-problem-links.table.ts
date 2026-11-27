import { foreignKey, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { learningBlocks } from './learning-blocks.table.js';
import { learningGuides } from './learning-guides.table.js';

export const learningProblemLinks = pgTable(
  'learning_problem_links',
  {
    blockId: uuid('block_id').primaryKey(),
    guideId: uuid('guide_id').notNull(),
    normalizedUrl: text('normalized_url').notNull(),
    displayUrl: text('display_url').notNull(),
  },
  (t) => [
    foreignKey({
      name: 'learning_problem_links_block_fk',
      columns: [t.guideId, t.blockId],
      foreignColumns: [learningBlocks.guideId, learningBlocks.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'learning_problem_links_guide_fk',
      columns: [t.guideId],
      foreignColumns: [learningGuides.id],
    }).onDelete('cascade'),
  ],
);

export type LearningProblemLink = typeof learningProblemLinks.$inferSelect;