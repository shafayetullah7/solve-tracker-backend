export const GOOGLE_OAUTH_AUTHORIZE_URL =
  'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_OPENID_CONFIGURATION_URL =
  'https://accounts.google.com/.well-known/openid-configuration';
export const GOOGLE_OAUTH_DEFAULT_SCOPES = 'openid email profile';
export const GOOGLE_OAUTH_STATE_COOKIE = 'practice_google_oauth';
export const GOOGLE_ID_TOKEN_ISSUERS = [
  'https://accounts.google.com',
  'accounts.google.com',
] as const;
export const GOOGLE_JWKS_FETCH_TIMEOUT_MS = 5000;
export const GOOGLE_JWKS_CACHE_TTL_MS = 3_600_000;
export const GOOGLE_OAUTH_DEFAULT_STATE_TTL_SECONDS = 600;