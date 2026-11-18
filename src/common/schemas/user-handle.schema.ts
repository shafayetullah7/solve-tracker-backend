import { z } from 'zod';
import { measureCodePoints } from '../unicode.js';

export const USER_HANDLE_MIN = 3;
export const USER_HANDLE_MAX = 24;

/** Must match docs/USER_HANDLE_A0_RESULTS.md (alphabetical, lowercase). */
export const USER_HANDLE_RESERVED_LIST = [
  'account',
  'admin',
  'api',
  'app',
  'auth',
  'dashboard',
  'discover',
  'edit',
  'forgot',
  'google',
  'health',
  'help',
  'login',
  'logout',
  'me',
  'media',
  'new',
  'null',
  'password',
  'platforms',
  'practice',
  'problems',
  'profile',
  'progress',
  'register',
  'reset',
  'risc',
  'root',
  'settings',
  'support',
  'topics',
  'u',
  'users',
  'www',
] as const;

export const USER_HANDLE_RESERVED: ReadonlySet<string> = new Set(
  USER_HANDLE_RESERVED_LIST,
);

const HANDLE_BODY = /^[a-zA-Z0-9_]+$/;
const HANDLE_EDGES = /^[a-zA-Z0-9].*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;

export const HANDLE_FORMAT_MESSAGE =
  'Handle must use 3–24 letters, digits, or underscores, and start and end with a letter or digit';

export function normalizeUserHandle(raw: string): string {
  const trimmed = raw.trim();
  if (/\s/.test(trimmed)) {
    throw new Error(HANDLE_FORMAT_MESSAGE);
  }
  return trimmed.toLowerCase();
}

function assertValidHandleShape(value: string): void {
  if (USER_HANDLE_RESERVED.has(value.toLowerCase())) {
    throw new Error('This handle is reserved');
  }
  const len = measureCodePoints(value);
  if (len < USER_HANDLE_MIN || len > USER_HANDLE_MAX) {
    throw new Error(HANDLE_FORMAT_MESSAGE);
  }
  if (!HANDLE_BODY.test(value)) {
    throw new Error(HANDLE_FORMAT_MESSAGE);
  }
  if (!HANDLE_EDGES.test(value)) {
    throw new Error(HANDLE_FORMAT_MESSAGE);
  }
}

export const userHandleSchema = z
  .string()
  .transform((value) => normalizeUserHandle(value))
  .superRefine((value, ctx) => {
    try {
      assertValidHandleShape(value);
    } catch (error) {
      ctx.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : HANDLE_FORMAT_MESSAGE,
      });
    }
  });

export const profileHandleSchema = userHandleSchema;

export const optionalUserHandleSchema = z
  .union([z.literal('').transform(() => undefined), userHandleSchema])
  .optional();