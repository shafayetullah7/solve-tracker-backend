import { Logger } from '@nestjs/common';
import {
  GOOGLE_RISC_SUBSCRIBED_EVENT_TYPES,
} from './google-risc.constants.js';
import type { VerifiedRiscEvent, VerifiedRiscEventEntry } from './google-risc.types.js';

const ACCOUNT_DISABLED =
  'https://schemas.openid.net/secevent/risc/event-type/account-disabled';
const SESSIONS_REVOKED =
  'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked';
const TOKENS_REVOKED =
  'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked';

export const RISC_AUDIT_ACCOUNT_DISABLED = 'risc:account-disabled';
export const RISC_AUDIT_SESSIONS_REVOKED = 'risc:sessions-revoked';
export const RISC_AUDIT_TOKENS_REVOKED = 'risc:tokens-revoked';

const subscribed = new Set<string>(GOOGLE_RISC_SUBSCRIBED_EVENT_TYPES);

export function collectMatchedEvents(
  event: VerifiedRiscEvent,
): Record<string, VerifiedRiscEventEntry> {
  const matched: Record<string, VerifiedRiscEventEntry> = {};
  for (const [type, entry] of Object.entries(event.events)) {
    if (subscribed.has(type)) matched[type] = entry;
  }
  return matched;
}

export function firstProviderSubject(
  matched: Record<string, VerifiedRiscEventEntry>,
): string | undefined {
  for (const type of GOOGLE_RISC_SUBSCRIBED_EVENT_TYPES) {
    const sub = matched[type]?.subjectSub;
    if (sub) return sub;
  }
  return undefined;
}

export function auditReasonFor(matchedTypes: string[]): string {
  if (matchedTypes.includes(ACCOUNT_DISABLED)) return RISC_AUDIT_ACCOUNT_DISABLED;
  if (matchedTypes.includes(SESSIONS_REVOKED)) return RISC_AUDIT_SESSIONS_REVOKED;
  if (matchedTypes.includes(TOKENS_REVOKED)) return RISC_AUDIT_TOKENS_REVOKED;
  return RISC_AUDIT_SESSIONS_REVOKED;
}

export function logAccountDisabled(
  logger: Logger,
  fields: {
    jti: string;
    providerSubject: string;
    userId: string;
    reason?: string;
  },
): void {
  const payload = {
    jti: fields.jti,
    providerSubject: fields.providerSubject,
    userId: fields.userId,
    reason: fields.reason ?? 'missing',
  };
  if (fields.reason === 'hijacking') {
    logger.error('Google RISC account-disabled (hijacking)', payload);
  } else {
    logger.warn('Google RISC account-disabled', payload);
  }
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code =
    'code' in error && typeof (error as { code: unknown }).code === 'string'
      ? (error as { code: string }).code
      : '';
  if (code === '23505') return true;
  const cause =
    'cause' in error ? (error as { cause: unknown }).cause : undefined;
  if (
    cause &&
    typeof cause === 'object' &&
    'code' in cause &&
    (cause as { code: string }).code === '23505'
  ) {
    return true;
  }
  return false;
}