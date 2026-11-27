import { pgEnum } from 'drizzle-orm/pg-core';

/** Canonical block type values (PostgreSQL enum and API). */
export const learningBlockType = {
  Text: 'text',
  Code: 'code',
  Checklist: 'checklist',
  Link: 'link',
} as const;

export const LEARNING_BLOCK_TYPES = [
  learningBlockType.Text,
  learningBlockType.Code,
  learningBlockType.Checklist,
  learningBlockType.Link,
] as const;

export type LearningBlockType = (typeof LEARNING_BLOCK_TYPES)[number];

export const learningBlockTypeEnum = pgEnum(
  'learning_block_type',
  [...LEARNING_BLOCK_TYPES],
);