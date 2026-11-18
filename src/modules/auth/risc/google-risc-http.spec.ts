import { describe, expect, it } from 'vitest';
import { GoogleRiscError, GoogleRiscErrorCodes } from './google-risc.errors.js';
import {
  emptySetBodyError,
  googleRiscErrorDisposition,
  rawSetBodyFromRequest,
} from './google-risc-http.js';

describe('google-risc-http', () => {
  it('reads string body from request', () => {
    expect(rawSetBodyFromRequest({ body: 'jwt.here.sig' } as never)).toBe(
      'jwt.here.sig',
    );
    expect(rawSetBodyFromRequest({ body: { bad: true } } as never)).toBe('');
  });

  it('emptySetBodyError is 400 malformed', () => {
    const err = emptySetBodyError();
    expect(err.getStatus()).toBe(400);
    expect(err.getResponse()).toMatchObject({
      code: GoogleRiscErrorCodes.RISC_SET_MALFORMED,
    });
  });

  it.each([
    [GoogleRiscErrorCodes.RISC_SET_MALFORMED, 400],
    [GoogleRiscErrorCodes.RISC_SET_KEY_UNKNOWN, 400],
    [GoogleRiscErrorCodes.RISC_SET_INVALID, 401],
  ])('maps %s to throw', (code, status) => {
    const disposition = googleRiscErrorDisposition(
      new GoogleRiscError(code as never, 'test'),
    );
    expect(disposition.kind).toBe('throw');
    if (disposition.kind === 'throw') {
      expect(disposition.error.getStatus()).toBe(status);
      expect(disposition.error.getResponse()).toMatchObject({ code });
    }
  });

  it('maps audience mismatch to accept_202', () => {
    expect(
      googleRiscErrorDisposition(
        new GoogleRiscError(
          GoogleRiscErrorCodes.RISC_SET_AUDIENCE_MISMATCH,
          'aud',
        ),
      ).kind,
    ).toBe('accept_202');
  });

  it('maps JWKS and unknown errors to internal_error', () => {
    expect(
      googleRiscErrorDisposition(
        new GoogleRiscError(
          GoogleRiscErrorCodes.RISC_JWKS_UNAVAILABLE,
          'jwks',
        ),
      ).kind,
    ).toBe('internal_error');
    expect(googleRiscErrorDisposition(new Error('boom')).kind).toBe(
      'internal_error',
    );
  });
});