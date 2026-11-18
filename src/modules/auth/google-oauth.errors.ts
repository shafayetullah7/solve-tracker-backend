export const GoogleOAuthErrorCodes = {
  OAUTH_DISABLED: 'OAUTH_DISABLED',
  OAUTH_STATE_INVALID: 'OAUTH_STATE_INVALID',
  OAUTH_TOKEN_EXCHANGE_FAILED: 'OAUTH_TOKEN_EXCHANGE_FAILED',
  OAUTH_ID_TOKEN_INVALID: 'OAUTH_ID_TOKEN_INVALID',
  OAUTH_EMAIL_UNVERIFIED: 'OAUTH_EMAIL_UNVERIFIED',
  OAUTH_MISCONFIGURED: 'OAUTH_MISCONFIGURED',
  OAUTH_ACCOUNT_CONFLICT: 'OAUTH_ACCOUNT_CONFLICT',
} as const;

export type GoogleOAuthErrorCode =
  (typeof GoogleOAuthErrorCodes)[keyof typeof GoogleOAuthErrorCodes];

export class GoogleOAuthError extends Error {
  constructor(
    readonly code: GoogleOAuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GoogleOAuthError';
  }
}