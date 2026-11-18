import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { environmentSchema } from '../../config/environment.js';
import type { Environment } from '../../config/environment.js';
import { authTestEnvironment } from '../../../test/auth-env.js';
import { GOOGLE_OAUTH_STATE_COOKIE } from './google-oauth.constants.js';
import { GoogleOAuthErrorCodes } from './google-oauth.errors.js';
import { OAuthStateService } from './oauth-state.service.js';

const config = () =>
  new ConfigService<Environment, true>(
    environmentSchema.parse({
      ...authTestEnvironment,
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: '3000',
      DATABASE_URL: 'postgresql://test:test@localhost/test',
      SWAGGER_ENABLED: 'false',
    }),
  );

describe('OAuthStateService', () => {
  it('round-trips state and PKCE via cookie', () => {
    const service = new OAuthStateService(config());
    const { state, setCookie } = service.createStart({ next: '/app' });
    const cookiePair = setCookie.split(';')[0] ?? '';
    const name = cookiePair.split('=')[0];
    const cookieValue = cookiePair.slice(name.length + 1);
    expect(name).toBe(GOOGLE_OAUTH_STATE_COOKIE);
    const req = { headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${cookieValue}` } } as import('express').Request;
    const result = service.validateCallback(req, state);
    expect(result.codeVerifier).toBeTruthy();
    expect(result.next).toBe('/app');
  });

  it('rejects invalid state', () => {
    const service = new OAuthStateService(config());
    const { state, setCookie } = service.createStart();
    const cookiePair = setCookie.split(';')[0] ?? '';
    const name = cookiePair.split('=')[0];
    const cookieValue = cookiePair.slice(name.length + 1);
    const req = { headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${cookieValue}` } } as import('express').Request;
    try {
      service.validateCallback(req, `${state}-wrong`);
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toMatchObject({ code: GoogleOAuthErrorCodes.OAUTH_STATE_INVALID });
    }
  });

  it('rejects expired state', () => {
    vi.useFakeTimers();
    try {
      const service = new OAuthStateService(config());
      const { state, setCookie } = service.createStart();
      const cookiePair = setCookie.split(';')[0] ?? '';
      const cookieValue = cookiePair.slice(GOOGLE_OAUTH_STATE_COOKIE.length + 1);
      vi.advanceTimersByTime(601_000);
      const req = { headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${cookieValue}` } } as import('express').Request;
      try {
        service.validateCallback(req, state);
        throw new Error('expected failure');
      } catch (error) {
        expect(error).toMatchObject({ code: GoogleOAuthErrorCodes.OAUTH_STATE_INVALID });
      }
    } finally {
      vi.useRealTimers();
    }
  });
});