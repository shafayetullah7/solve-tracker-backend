import type { Request } from 'express';
import { authError } from '../auth.errors.js';
import {
  GoogleRiscError,
  GoogleRiscErrorCodes,
  type GoogleRiscErrorCode,
} from './google-risc.errors.js';
import type { RiscHandleOutcome } from './google-risc.types.js';

export type GoogleRiscHttpDisposition =
  | { kind: 'throw'; error: ReturnType<typeof authError> }
  | { kind: 'accept_202' }
  | { kind: 'internal_error' };

const BAD_REQUEST_CODES = new Set<GoogleRiscErrorCode>([
  GoogleRiscErrorCodes.RISC_SET_MALFORMED,
  GoogleRiscErrorCodes.RISC_SET_KEY_UNKNOWN,
]);

const UNAUTHORIZED_CODES = new Set<GoogleRiscErrorCode>([
  GoogleRiscErrorCodes.RISC_SET_INVALID,
]);

export function rawSetBodyFromRequest(req: Request): string {
  return typeof req.body === 'string' ? req.body : '';
}

export function emptySetBodyError(): ReturnType<typeof authError> {
  return authError(
    400,
    GoogleRiscErrorCodes.RISC_SET_MALFORMED,
    'Security event token is empty.',
  );
}

export function googleRiscErrorDisposition(
  error: unknown,
): GoogleRiscHttpDisposition {
  if (!(error instanceof GoogleRiscError)) {
    return { kind: 'internal_error' };
  }
  if (error.code === GoogleRiscErrorCodes.RISC_SET_AUDIENCE_MISMATCH) {
    return { kind: 'accept_202' };
  }
  if (error.code === GoogleRiscErrorCodes.RISC_JWKS_UNAVAILABLE) {
    return { kind: 'internal_error' };
  }
  if (BAD_REQUEST_CODES.has(error.code)) {
    return {
      kind: 'throw',
      error: authError(400, error.code, error.message),
    };
  }
  if (UNAUTHORIZED_CODES.has(error.code)) {
    return {
      kind: 'throw',
      error: authError(401, error.code, error.message),
    };
  }
  return { kind: 'internal_error' };
}

export function logRiscOutcome(
  logger: { log: (message: string, fields?: Record<string, unknown>) => void },
  outcome: RiscHandleOutcome,
): void {
  const fields: Record<string, unknown> = { jti: outcome.jti, status: outcome.status };
  if ('providerSubject' in outcome && outcome.providerSubject) {
    fields.providerSubject = outcome.providerSubject;
  }
  if ('userId' in outcome && outcome.userId) {
    fields.userId = outcome.userId;
  }
  if ('revokedCount' in outcome && outcome.revokedCount !== undefined) {
    fields.revokedCount = outcome.revokedCount;
  }
  if ('matchedEventTypes' in outcome && outcome.matchedEventTypes) {
    fields.matchedEventTypes = outcome.matchedEventTypes;
  }
  logger.log('Google RISC event handled', fields);
}