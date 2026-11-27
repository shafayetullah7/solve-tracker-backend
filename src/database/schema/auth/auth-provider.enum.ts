import { pgEnum } from 'drizzle-orm/pg-core';

/** Canonical OAuth provider identifiers (PostgreSQL enum). */
export const authProvider = {
  Google: 'google',
} as const;

export const AUTH_PROVIDER_VALUES = [authProvider.Google] as const;

export type AuthProviderName = (typeof AUTH_PROVIDER_VALUES)[number];

export const authProviderEnum = pgEnum('auth_provider', [...AUTH_PROVIDER_VALUES]);

export const AUTH_PROVIDER_GOOGLE = authProvider.Google;