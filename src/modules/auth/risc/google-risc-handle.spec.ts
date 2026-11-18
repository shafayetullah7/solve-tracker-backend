import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { environmentSchema } from '../../../config/environment.js';
import type { Environment } from '../../../config/environment.js';
import { authTestEnvironment } from '../../../../test/auth-env.js';
import type { AuthService } from '../auth.service.js';
import type { AuthProviderIdentityRepository } from '../google/auth-provider-identity.repository.js';
import { GOOGLE_RISC_SUBSCRIBED_EVENT_TYPES } from './google-risc.constants.js';
import {
  RISC_AUDIT_ACCOUNT_DISABLED,
  RISC_AUDIT_SESSIONS_REVOKED,
  RISC_AUDIT_TOKENS_REVOKED,
} from './google-risc-event.js';
import { GoogleRiscJwksCache } from './google-risc-jwks.cache.js';
import { GoogleRiscService } from './google-risc.service.js';
import type { RiscEventReceiptRepository } from './risc-event-receipt.repository.js';
import type { VerifiedRiscEvent } from './google-risc.types.js';

const SESSIONS_REVOKED = GOOGLE_RISC_SUBSCRIBED_EVENT_TYPES[0];
const TOKENS_REVOKED = GOOGLE_RISC_SUBSCRIBED_EVENT_TYPES[1];
const ACCOUNT_DISABLED = GOOGLE_RISC_SUBSCRIBED_EVENT_TYPES[2];

const enabledEnv = {
  ...authTestEnvironment,
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3000',
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  SWAGGER_ENABLED: 'false',
  GOOGLE_OAUTH_ENABLED: 'true',
  GOOGLE_OAUTH_CLIENT_ID: 'client.apps.googleusercontent.com',
  GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
  GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
  GOOGLE_RISC_ENABLED: 'true',
} as const;

function configFrom(env: Record<string, string>) {
  return new ConfigService<Environment, true>(environmentSchema.parse(env));
}

function verifiedEvent(
  overrides: Partial<VerifiedRiscEvent> & { jti: string },
): VerifiedRiscEvent {
  return {
    iat: Math.floor(Date.now() / 1000),
    issuer: 'https://accounts.google.com/',
    audience: 'client.apps.googleusercontent.com',
    events: {},
    ...overrides,
  };
}

function mockHandleDeps() {
  const tx = {};
  const receipts = {
    existsByJti: vi.fn(async () => false),
    transaction: vi.fn(async (fn: (inner: unknown) => Promise<unknown>) =>
      fn(tx),
    ),
    deleteReceivedBefore: vi.fn(async () => 0),
    createOrDuplicate: vi.fn(async () => 'created' as const),
  };
  const identities = {
    findByProviderSubject: vi.fn(async () => undefined),
  };
  const auth = {
    revokeAllSessionsForUser: vi.fn(async () => 2),
  };
  const config = configFrom({ ...enabledEnv });
  const jwks = new GoogleRiscJwksCache(config);
  const service = new GoogleRiscService(
    config,
    jwks,
    receipts as unknown as RiscEventReceiptRepository,
    identities as unknown as AuthProviderIdentityRepository,
    auth as unknown as AuthService,
  );
  return { service, receipts, identities, auth, tx };
}

describe('GoogleRiscService.handleVerifiedEvent', () => {
  it('returns duplicate when jti already exists', async () => {
    const { service, receipts, auth } = mockHandleDeps();
    receipts.existsByJti.mockResolvedValueOnce(true);
    const result = await service.handleVerifiedEvent(
      verifiedEvent({ jti: 'dup-jti', events: {} }),
    );
    expect(result).toEqual({ status: 'duplicate', jti: 'dup-jti' });
    expect(auth.revokeAllSessionsForUser).not.toHaveBeenCalled();
    expect(receipts.transaction).not.toHaveBeenCalled();
  });

  it('records noop when no subscribed events are present', async () => {
    const { service, receipts, auth } = mockHandleDeps();
    const result = await service.handleVerifiedEvent(
      verifiedEvent({
        jti: 'noop-jti',
        events: {
          'https://unknown/event': { subjectSub: 'ignored' },
        },
      }),
    );
    expect(result.status).toBe('noop');
    expect(receipts.createOrDuplicate).toHaveBeenCalledWith(
      expect.objectContaining({ jti: 'noop-jti', eventTypes: [] }),
      expect.anything(),
    );
    expect(auth.revokeAllSessionsForUser).not.toHaveBeenCalled();
  });

  it('records orphan when identity is missing', async () => {
    const { service, receipts, auth } = mockHandleDeps();
    const sub = 'google-sub-orphan';
    const result = await service.handleVerifiedEvent(
      verifiedEvent({
        jti: 'orphan-jti',
        events: {
          [SESSIONS_REVOKED]: { subjectSub: sub },
        },
      }),
    );
    expect(result).toMatchObject({
      status: 'orphan',
      jti: 'orphan-jti',
      providerSubject: sub,
    });
    expect(auth.revokeAllSessionsForUser).not.toHaveBeenCalled();
    expect(receipts.createOrDuplicate).toHaveBeenCalled();
  });

  it('revokes sessions when identity is linked', async () => {
    const { service, receipts, identities, auth } = mockHandleDeps();
    const userId = '11111111-1111-4111-8111-111111111111';
    const sub = 'google-sub-linked';
    identities.findByProviderSubject.mockResolvedValueOnce({
      userId,
      providerSubject: sub,
    });
    const result = await service.handleVerifiedEvent(
      verifiedEvent({
        jti: 'revoke-jti',
        events: {
          [TOKENS_REVOKED]: { subjectSub: sub },
        },
      }),
    );
    expect(result).toMatchObject({
      status: 'revoked',
      userId,
      providerSubject: sub,
      revokedCount: 2,
    });
    expect(auth.revokeAllSessionsForUser).toHaveBeenCalledWith(
      userId,
      RISC_AUDIT_TOKENS_REVOKED,
      expect.anything(),
    );
    expect(receipts.deleteReceivedBefore).toHaveBeenCalled();
  });

  it('uses account-disabled audit reason and logs hijacking at error', async () => {
    const { service, identities, auth } = mockHandleDeps();
    const userId = '22222222-2222-4222-8222-222222222222';
    const sub = 'google-sub-disabled';
    identities.findByProviderSubject.mockResolvedValueOnce({ userId });
    const errorSpy = vi.spyOn(Logger.prototype, 'error');
    const warnSpy = vi.spyOn(Logger.prototype, 'warn');

    await service.handleVerifiedEvent(
      verifiedEvent({
        jti: 'disabled-jti',
        events: {
          [ACCOUNT_DISABLED]: { subjectSub: sub, reason: 'hijacking' },
        },
      }),
    );
    expect(auth.revokeAllSessionsForUser).toHaveBeenCalledWith(
      userId,
      RISC_AUDIT_ACCOUNT_DISABLED,
      expect.anything(),
    );
    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('prefers sessions-revoked audit reason when both event types match', async () => {
    const { service, identities, auth } = mockHandleDeps();
    const userId = '33333333-3333-4333-8333-333333333333';
    const sub = 'google-sub-multi';
    identities.findByProviderSubject.mockResolvedValueOnce({ userId });

    await service.handleVerifiedEvent(
      verifiedEvent({
        jti: 'multi-jti',
        events: {
          [SESSIONS_REVOKED]: { subjectSub: sub },
          [TOKENS_REVOKED]: { subjectSub: sub },
        },
      }),
    );
    expect(auth.revokeAllSessionsForUser).toHaveBeenCalledWith(
      userId,
      RISC_AUDIT_SESSIONS_REVOKED,
      expect.anything(),
    );
  });
});