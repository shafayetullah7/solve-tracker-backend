import { ConfigService } from '@nestjs/config';
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
} from 'jose';
import { describe, expect, it } from 'vitest';
import { environmentSchema } from '../../../config/environment.js';
import type { Environment } from '../../../config/environment.js';
import { authTestEnvironment } from '../../../../test/auth-env.js';
import { GOOGLE_RISC_DEFAULT_EVENT_TTL_SECONDS } from './google-risc.constants.js';
import { GoogleRiscErrorCodes } from './google-risc.errors.js';
import { GoogleRiscJwksCache } from './google-risc-jwks.cache.js';
import type { AuthService } from '../auth.service.js';
import type { AuthProviderIdentityRepository } from '../google/auth-provider-identity.repository.js';
import { GoogleRiscService } from './google-risc.service.js';
import type { RiscEventReceiptRepository } from './risc-event-receipt.repository.js';

const CLIENT_ID = 'test.apps.googleusercontent.com';
const SESSIONS_REVOKED =
  'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked';

const baseEnv = {
  ...authTestEnvironment,
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3000',
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  SWAGGER_ENABLED: 'false',
} as const;

const enabledEnv = {
  ...baseEnv,
  GOOGLE_OAUTH_ENABLED: 'true',
  GOOGLE_OAUTH_CLIENT_ID: CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret-value',
  GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
  GOOGLE_RISC_ENABLED: 'true',
} as const;

function configFrom(env: Record<string, string>) {
  return new ConfigService<Environment, true>(environmentSchema.parse(env));
}

function stubHandleDeps() {
  const receipts = {
    existsByJti: async () => false,
    transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn({} as never),
    deleteReceivedBefore: async () => 0,
    createOrDuplicate: async () => 'created' as const,
  } as unknown as RiscEventReceiptRepository;
  const identities = {
    findByProviderSubject: async () => undefined,
  } as unknown as AuthProviderIdentityRepository;
  const auth = {
    revokeAllSessionsForUser: async () => 0,
  } as unknown as AuthService;
  return { receipts, identities, auth };
}

function serviceFor(env: Record<string, string>) {
  const config = configFrom(env);
  const jwks = new GoogleRiscJwksCache(config);
  const { receipts, identities, auth } = stubHandleDeps();
  return {
    service: new GoogleRiscService(config, jwks, receipts, identities, auth),
    jwks,
    config,
  };
}

async function localJwks() {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const keySet = createLocalJWKSet({
    keys: [{ ...jwk, alg: 'RS256', use: 'sig' }],
  });
  return { privateKey, keySet };
}

async function signSet(
  privateKey: CryptoKey,
  claims: {
    jti: string;
    events: Record<string, unknown>;
    aud?: string;
    expOffsetSec?: number;
  },
) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (claims.expOffsetSec ?? 3600);
  return new SignJWT({ events: claims.events })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer('https://accounts.google.com/')
    .setAudience(claims.aud ?? CLIENT_ID)
    .setJti(claims.jti)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(privateKey);
}

describe('GoogleRiscService configuration', () => {
  it('reports disabled by default', () => {
    expect(serviceFor({ ...baseEnv }).service.isEnabled()).toBe(false);
  });

  it('reports enabled when RISC and OAuth are configured', () => {
    const { service } = serviceFor(enabledEnv);
    expect(service.isEnabled()).toBe(true);
    expect(service.audience()).toBe(CLIENT_ID);
    expect(service.eventTtlSeconds()).toBe(
      GOOGLE_RISC_DEFAULT_EVENT_TTL_SECONDS,
    );
  });

  it('uses GOOGLE_RISC_AUDIENCE when set', () => {
    const { service } = serviceFor({
      ...enabledEnv,
      GOOGLE_RISC_AUDIENCE: 'custom-audience',
    });
    expect(service.audience()).toBe('custom-audience');
  });
});

describe('GoogleRiscService.verifySet', () => {
  it('rejects verify when RISC is disabled', async () => {
    const { service } = serviceFor({ ...baseEnv });
    await expect(service.verifySet('token')).rejects.toMatchObject({
      code: GoogleRiscErrorCodes.RISC_DISABLED,
    });
  });

  it('rejects malformed tokens', async () => {
    const { service, jwks } = serviceFor(enabledEnv);
    const { keySet } = await localJwks();
    jwks.useKeySetForTests(keySet);
    await expect(service.verifySet('')).rejects.toMatchObject({
      code: GoogleRiscErrorCodes.RISC_SET_MALFORMED,
    });
    await expect(service.verifySet('not-a-jwt')).rejects.toMatchObject({
      code: GoogleRiscErrorCodes.RISC_SET_MALFORMED,
    });
  });

  it('verifies a valid security event token', async () => {
    const { privateKey, keySet } = await localJwks();
    const { service, jwks } = serviceFor(enabledEnv);
    jwks.useKeySetForTests(keySet);
    const jti = '756E69717565206964656E746966696572';
    const set = await signSet(privateKey, {
      jti,
      events: {
        [SESSIONS_REVOKED]: {
          subject: {
            subject_type: 'iss-sub',
            iss: 'https://accounts.google.com/',
            sub: '7375626A656374',
          },
        },
      },
    });
    const verified = await service.verifySet(set);
    expect(verified.jti).toBe(jti);
    expect(verified.events[SESSIONS_REVOKED]?.subjectSub).toBe('7375626A656374');
    expect(service.parseGoogleAccountSub(verified.events[SESSIONS_REVOKED]!)).toBe(
      '7375626A656374',
    );
  });

  it('rejects wrong audience', async () => {
    const { privateKey, keySet } = await localJwks();
    const { service, jwks } = serviceFor(enabledEnv);
    jwks.useKeySetForTests(keySet);
    const set = await signSet(privateKey, {
      jti: 'aud-mismatch',
      aud: 'other-client.apps.googleusercontent.com',
      events: {
        [SESSIONS_REVOKED]: {
          subject: { subject_type: 'iss-sub', sub: 'sub-1' },
        },
      },
    });
    await expect(service.verifySet(set)).rejects.toMatchObject({
      code: GoogleRiscErrorCodes.RISC_SET_AUDIENCE_MISMATCH,
    });
  });

  it('rejects invalid signature', async () => {
    const { privateKey, keySet } = await localJwks();
    const { service, jwks } = serviceFor(enabledEnv);
    jwks.useKeySetForTests(keySet);
    const set = await signSet(privateKey, {
      jti: 'bad-sig',
      events: {
        [SESSIONS_REVOKED]: {
          subject: { subject_type: 'iss-sub', sub: 'sub-1' },
        },
      },
    });
    const [header, payload] = set.split('.');
    const bad = `${header}.${payload}.invalidsignature`;
    await expect(service.verifySet(bad)).rejects.toMatchObject({
      code: GoogleRiscErrorCodes.RISC_SET_INVALID,
    });
  });

  it('accepts tokens with expired exp', async () => {
    const { privateKey, keySet } = await localJwks();
    const { service, jwks } = serviceFor(enabledEnv);
    jwks.useKeySetForTests(keySet);
    const set = await signSet(privateKey, {
      jti: 'expired-but-valid',
      expOffsetSec: -3600,
      events: {
        [SESSIONS_REVOKED]: {
          subject: { subject_type: 'iss-sub', sub: 'sub-expired' },
        },
      },
    });
    const verified = await service.verifySet(set);
    expect(verified.jti).toBe('expired-but-valid');
  });
});