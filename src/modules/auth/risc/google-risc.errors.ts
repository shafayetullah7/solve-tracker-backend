export const GoogleRiscErrorCodes = {
  RISC_DISABLED: 'RISC_DISABLED',
  RISC_SET_MALFORMED: 'RISC_SET_MALFORMED',
  RISC_SET_KEY_UNKNOWN: 'RISC_SET_KEY_UNKNOWN',
  RISC_SET_INVALID: 'RISC_SET_INVALID',
  RISC_SET_AUDIENCE_MISMATCH: 'RISC_SET_AUDIENCE_MISMATCH',
  RISC_JWKS_UNAVAILABLE: 'RISC_JWKS_UNAVAILABLE',
} as const;

export type GoogleRiscErrorCode =
  (typeof GoogleRiscErrorCodes)[keyof typeof GoogleRiscErrorCodes];

export class GoogleRiscError extends Error {
  constructor(
    readonly code: GoogleRiscErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GoogleRiscError';
  }
}