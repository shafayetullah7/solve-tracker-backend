export const GOOGLE_RISC_CONFIGURATION_URL =
  'https://accounts.google.com/.well-known/risc-configuration';
export const GOOGLE_RISC_DEFAULT_EVENT_TTL_SECONDS = 2_592_000;
export const GOOGLE_RISC_JWKS_FETCH_TIMEOUT_MS = 5000;
export const GOOGLE_RISC_JWKS_CACHE_TTL_MS = 3_600_000;
/** Historical SETs may carry past exp; do not reject on expiry. */
export const GOOGLE_RISC_SET_CLOCK_TOLERANCE_SEC = Number.MAX_SAFE_INTEGER;
export const GOOGLE_RISC_MAX_BODY_BYTES = 8192;
export const GOOGLE_RISC_RATE_LIMIT_PER_IP = 120;
export const GOOGLE_RISC_RATE_LIMIT_GLOBAL = 600;
export const GOOGLE_RISC_RATE_LIMIT_WINDOW_MS = 60_000;
export const GOOGLE_RISC_RECEIVER_PATH = '/auth/google/risc';

export const GOOGLE_RISC_SUBSCRIBED_EVENT_TYPES = [
  'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked',
  'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked',
  'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
] as const;

export const GOOGLE_RISC_ISSUERS = [
  'https://accounts.google.com/',
  'accounts.google.com',
] as const;

export type GoogleRiscSubscribedEventType =
  (typeof GOOGLE_RISC_SUBSCRIBED_EVENT_TYPES)[number];