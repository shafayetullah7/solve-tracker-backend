import { ConfigService } from '@nestjs/config';
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
} from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { environmentSchema } from '../../config/environment.js';
import type { Environment } from '../../config/environment.js';
import { authTestEnvironment } from '../../../test/auth-env.js';
import { GoogleJwksCache } from './google-jwks.cache.js';
import { GoogleOAuthErrorCodes } from './google-oauth.errors.js';
import { GoogleOAuthService } from './google-oauth.service.js';

const CLIENT_ID = 'test.apps.googleusercontent.com';
const enabledEnv = {
  ...authTestEnvironment,
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3000',
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  SWAGGER_ENABLED: 'false',
  GOOGLE_OAUTH_ENABLED: 'true',
  GOOGLE_OAUTH_CLIENT_ID: CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret-value',
  GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
} as const;

const config = () =>
  new ConfigService<Environment, true>(environmentSchema.parse(enabledEnv));

async function localJwks() {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const keySet = createLocalJWKSet({ keys: [{ ...jwk, alg: 'RS256', use: 'sig' }] });
  return { privateKey, keySet };
}

async function signIdToken(
  privateKey: CryptoKey,
  claims: Record<string, unknown>,
  expOffsetSec = 3600,
) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer('https://accounts.google.com')
    .setAudience(CLIENT_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + expOffsetSec)
    .sign(privateKey);
}

describe('GoogleOAuthService', () => {
  it('reports disabled when feature flag is off', () => {
    const off = environmentSchema.parse({
      ...authTestEnvironment,
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: '3000',
      DATABASE_URL: 'postgresql://test:test@localhost/test',
      SWAGGER_ENABLED: 'false',
    });
    const service = new GoogleOAuthService(
      new ConfigService(off),
      new GoogleJwksCache(),
    );
    expect(service.isEnabled()).toBe(false);
  });

  it('builds authorization URL with PKCE and scopes', () => {
    const service = new GoogleOAuthService(config(), new GoogleJwksCache());
    const url = new URL(
      service.buildAuthorizationUrl({ state: 'state-token', codeChallenge: 'challenge' }),
    );
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toContain('openid');
  });

  it('exchanges code for id_token via fetch', async () => {
    const { privateKey, keySet } = await localJwks();
    const idToken = await signIdToken(privateKey, {
      sub: 'google-sub-1',
      email: 'User@Example.com',
      email_verified: true,
      name: 'User',
    });
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: idToken }),
    });
    const jwks = new GoogleJwksCache();
    jwks.useKeySetForTests(keySet);
    const service = new GoogleOAuthService(config(), jwks);
    service.useFetchForTests(fetchFn);
    const token = await service.exchangeCodeForIdToken('auth-code', 'verifier-123');
    expect(token).toBe(idToken);
    const body = String(fetchFn.mock.calls[0][1].body);
    expect(body).toContain('code_verifier=verifier-123');
  });

  it('verifies id_token and normalizes email', async () => {
    const { privateKey, keySet } = await localJwks();
    const idToken = await signIdToken(privateKey, {
      sub: 'google-sub-2',
      email: ' Person@Example.COM ',
      email_verified: true,
      name: ' Person ',
    });
    const jwks = new GoogleJwksCache();
    jwks.useKeySetForTests(keySet);
    const service = new GoogleOAuthService(config(), jwks);
    const profile = await service.verifyIdToken(idToken);
    expect(profile).toEqual({
      subject: 'google-sub-2',
      email: 'person@example.com',
      name: 'Person',
    });
  });

  it('rejects unverified email', async () => {
    const { privateKey, keySet } = await localJwks();
    const idToken = await signIdToken(privateKey, {
      sub: 'google-sub-3',
      email: 'noverify@example.com',
      email_verified: false,
    });
    const jwks = new GoogleJwksCache();
    jwks.useKeySetForTests(keySet);
    const service = new GoogleOAuthService(config(), jwks);
    await expect(service.verifyIdToken(idToken)).rejects.toMatchObject({
      code: GoogleOAuthErrorCodes.OAUTH_EMAIL_UNVERIFIED,
    });
  });

  it('rejects expired id_token', async () => {
    const { privateKey, keySet } = await localJwks();
    const idToken = await signIdToken(
      privateKey,
      {
        sub: 'google-sub-4',
        email: 'expired@example.com',
        email_verified: true,
      },
      -10,
    );
    const jwks = new GoogleJwksCache();
    jwks.useKeySetForTests(keySet);
    const service = new GoogleOAuthService(config(), jwks);
    await expect(service.verifyIdToken(idToken)).rejects.toMatchObject({
      code: GoogleOAuthErrorCodes.OAUTH_ID_TOKEN_INVALID,
    });
  });

  it('rejects wrong audience', async () => {
    const { privateKey, keySet } = await localJwks();
    const now = Math.floor(Date.now() / 1000);
    const idToken = await new SignJWT({
      sub: 'google-sub-5',
      email: 'wrongaud@example.com',
      email_verified: true,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer('https://accounts.google.com')
      .setAudience('other-client.apps.googleusercontent.com')
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);
    const jwks = new GoogleJwksCache();
    jwks.useKeySetForTests(keySet);
    const service = new GoogleOAuthService(config(), jwks);
    await expect(service.verifyIdToken(idToken)).rejects.toMatchObject({
      code: GoogleOAuthErrorCodes.OAUTH_ID_TOKEN_INVALID,
    });
  });
});