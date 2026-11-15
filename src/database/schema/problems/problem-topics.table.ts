import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { topics } from '../topics/topics.table.js';
import { problems } from './problems.table.js';

// Topic delete cascades join rows only; problem rows remain (FR-02).
// Problem delete cascades join rows and removes the problem.
export const problemTopics = pgTable(
  'problem_topics',
  {
    problemId: uuid('problem_id')
      .notNull()
      .references(() => problems.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.problemId, t.topicId], name: 'problem_topics_pkey' }),
    index('problem_topics_topic_idx').on(t.topicId),
  ],
);

export type ProblemTopic = typeof problemTopics.$inferSelect;
export type NewProblemTopic = typeof problemTopics.$inferInsert;