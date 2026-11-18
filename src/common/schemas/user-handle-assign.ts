import { randomBytes, type UUID } from 'node:crypto';

const ASSIGN_ALNUM = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Deterministic system handle from primary key (matches SQL backfill). */
export function systemHandleFromUserId(id: string): string {
  const hex = id.replace(/-/g, '').toLowerCase();
  return `u${hex.slice(0, 23)}`;
}

/** Random system handle when id-derived value collides (rare). */
export function generateRandomSystemHandle(): string {
  const bytes = randomBytes(22);
  let body = '';
  for (const b of bytes) {
    body += ASSIGN_ALNUM[b % ASSIGN_ALNUM.length]!;
  }
  return `r${body}`;
}

export const USER_HANDLE_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export function isUserHandleUniqueViolation(error: unknown): boolean {
  const cause =
    (error as { cause?: { code?: string; constraint?: string } })?.cause ??
    (error as { code?: string; constraint?: string });
  return (
    cause?.code === '23505' &&
    (cause.constraint === 'users_handle_lower_uniq' ||
      cause.constraint === 'users_handle_key')
  );
}

/** For inserts that set `id` before writing `handle`. */
export function defaultHandleForNewUser(id: UUID): string {
  return systemHandleFromUserId(id);
}