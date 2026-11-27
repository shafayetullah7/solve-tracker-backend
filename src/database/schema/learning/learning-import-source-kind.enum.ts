import { pgEnum } from 'drizzle-orm/pg-core';

/** Canonical import source kind values (PostgreSQL enum). */
export const learningImportSourceKind = {
  Markdown: 'markdown',
  Json: 'json',
  Bundle: 'bundle',
} as const;

export const LEARNING_IMPORT_SOURCE_KINDS = [
  learningImportSourceKind.Markdown,
  learningImportSourceKind.Json,
  learningImportSourceKind.Bundle,
] as const;

/** Preview/commit API; `bundle` reserved for future ZIP import. */
export const WRITABLE_LEARNING_IMPORT_SOURCE_KINDS = [
  learningImportSourceKind.Markdown,
  learningImportSourceKind.Json,
] as const;

export type LearningImportSourceKind =
  (typeof LEARNING_IMPORT_SOURCE_KINDS)[number];

export const learningImportSourceKindEnum = pgEnum(
  'learning_import_source_kind',
  [...LEARNING_IMPORT_SOURCE_KINDS],
);