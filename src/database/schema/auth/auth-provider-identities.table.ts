import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../users/users.table.js';
import { authProviderEnum } from './auth-provider.enum.js';

export const authProviderIdentities = pgTable(
  'auth_provider_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: authProviderEnum('provider').notNull(),
    providerSubject: text('provider_subject').notNull(),
    providerEmail: text('provider_email').notNull(),
    linkedAt: timestamp('linked_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('auth_provider_identities_provider_subject_uniq').on(
      t.provider,
      t.providerSubject,
    ),
    uniqueIndex('auth_provider_identities_user_provider_uniq').on(
      t.userId,
      t.provider,
    ),
    index('auth_provider_identities_user_idx').on(t.userId),
  ],
);

export type AuthProviderIdentity = typeof authProviderIdentities.$inferSelect;
export type NewAuthProviderIdentity =
  typeof authProviderIdentities.$inferInsert;