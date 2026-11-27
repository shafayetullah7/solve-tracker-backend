import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../users/users.table.js';
import { learningImportSourceKindEnum } from './learning-import-source-kind.enum.js';

export const learningImportPreviews = pgTable(
  'learning_import_previews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceKind: learningImportSourceKindEnum('source_kind').notNull(),
    sourceSha256: text('source_sha256').notNull(),
    normalizedPayload: jsonb('normalized_payload').notNull(),
    warnings: jsonb('warnings').notNull().default([]),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('learning_import_previews_owner_idx').on(t.ownerId),
    index('learning_import_previews_expires_idx').on(t.expiresAt),
  ],
);