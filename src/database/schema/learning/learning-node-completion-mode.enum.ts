import { pgEnum } from 'drizzle-orm/pg-core';

/** Canonical completion mode values (PostgreSQL enum and API). */
export const learningNodeCompletionMode = {
  Structural: 'structural',
  Manual: 'manual',
  Gated: 'gated',
} as const;

export const LEARNING_NODE_COMPLETION_MODES = [
  learningNodeCompletionMode.Structural,
  learningNodeCompletionMode.Manual,
  learningNodeCompletionMode.Gated,
] as const;

/** Create, patch, and portable import/export (gated requires assessment block on step). */
export const WRITABLE_LEARNING_NODE_COMPLETION_MODES = [
  learningNodeCompletionMode.Structural,
  learningNodeCompletionMode.Manual,
  learningNodeCompletionMode.Gated,
] as const;

export type LearningNodeCompletionMode =
  (typeof LEARNING_NODE_COMPLETION_MODES)[number];

export const learningNodeCompletionModeEnum = pgEnum(
  'learning_node_completion_mode',
  [...LEARNING_NODE_COMPLETION_MODES],
);