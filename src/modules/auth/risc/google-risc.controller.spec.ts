import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GoogleRiscError, GoogleRiscErrorCodes } from './google-risc.errors.js';
import { GoogleRiscController } from './google-risc.controller.js';
import type { GoogleRiscService } from './google-risc.service.js';
import type { VerifiedRiscEvent } from './google-risc.types.js';

const event: VerifiedRiscEvent = {
  jti: 'jti-1',
  iat: 1,
  issuer: 'https://accounts.google.com/',
  audience: 'client',
  events: {},
};

function mockService(
  overrides: Partial<GoogleRiscService> = {},
): GoogleRiscService {
  return {
    isEnabled: () => true,
    verifySet: vi.fn(async () => event),
    handleVerifiedEvent: vi.fn(async () => ({ status: 'noop', jti: 'jti-1' })),
    ...overrides,
  } as unknown as GoogleRiscService;
}

describe('GoogleRiscController', () => {
  it('returns 404 when disabled', async () => {
    const controller = new GoogleRiscController(
      mockService({ isEnabled: () => false }),
    );
    await expect(
      controller.receiveSecurityEventToken({ body: 'token' } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 400 on empty body', async () => {
    const service = mockService();
    const controller = new GoogleRiscController(service);
    await expect(
      controller.receiveSecurityEventToken({ body: '' } as never),
    ).rejects.toMatchObject({ status: 400 });
    expect(service.verifySet).not.toHaveBeenCalled();
  });

  it('accepts valid SET with 202', async () => {
    const service = mockService();
    const controller = new GoogleRiscController(service);
    await expect(
      controller.receiveSecurityEventToken({ body: 'jwt.token.here' } as never),
    ).resolves.toBeUndefined();
    expect(service.verifySet).toHaveBeenCalledWith('jwt.token.here');
    expect(service.handleVerifiedEvent).toHaveBeenCalledWith(event);
  });

  it('returns 202 on audience mismatch without handle', async () => {
    const service = mockService({
      verifySet: vi.fn(async () => {
        throw new GoogleRiscError(
          GoogleRiscErrorCodes.RISC_SET_AUDIENCE_MISMATCH,
          'aud',
        );
      }),
    });
    const controller = new GoogleRiscController(service);
    await expect(
      controller.receiveSecurityEventToken({ body: 'jwt' } as never),
    ).resolves.toBeUndefined();
    expect(service.handleVerifiedEvent).not.toHaveBeenCalled();
  });

  it('propagates malformed SET as 400', async () => {
    const service = mockService({
      verifySet: vi.fn(async () => {
        throw new GoogleRiscError(
          GoogleRiscErrorCodes.RISC_SET_MALFORMED,
          'bad',
        );
      }),
    });
    const controller = new GoogleRiscController(service);
    await expect(
      controller.receiveSecurityEventToken({ body: 'bad' } as never),
    ).rejects.toMatchObject({ status: 400 });
  });
});