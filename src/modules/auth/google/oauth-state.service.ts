import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseCookie, stringifySetCookie } from 'cookie';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type { Environment } from '../../../config/environment.js';
import {
  GOOGLE_OAUTH_DEFAULT_STATE_TTL_SECONDS,
  GOOGLE_OAUTH_STATE_COOKIE,
} from './google-oauth.constants.js';
import {
  GoogleOAuthError,
  GoogleOAuthErrorCodes,
} from './google-oauth.errors.js';
import { codeChallengeS256, generateCodeVerifier } from './oauth-pkce.js';
import { oauthReturnPath } from './oauth-return-path.js';

type StatePayload = {
  state: string;
  codeVerifier: string;
  next?: string;
  exp: number;
  mode?: 'login' | 'link';
  linkUserId?: string;
};

function base64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlEncodeJson(value: unknown): string {
  return base64Url(Buffer.from(JSON.stringify(value), 'utf8'));
}

function base64UrlDecodeJson<T>(encoded: string): T {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return JSON.parse(Buffer.from(padded + pad, 'base64').toString('utf8')) as T;
}

@Injectable()
export class OAuthStateService {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  private stateTtlSeconds(): number {
    return (
      this.config.get('GOOGLE_OAUTH_STATE_TTL_SECONDS') ??
      GOOGLE_OAUTH_DEFAULT_STATE_TTL_SECONDS
    );
  }

  private signingKey(): Buffer {
    return Buffer.from(
      this.config.getOrThrow('JWT_REFRESH_SECRET', { infer: true }),
      'utf8',
    );
  }

  private signPayload(encodedPayload: string): string {
    return base64Url(
      createHmac('sha256', this.signingKey()).update(encodedPayload).digest(),
    );
  }

  private pack(payload: StatePayload): string {
    const encoded = base64UrlEncodeJson(payload);
    return `${encoded}.${this.signPayload(encoded)}`;
  }

  private unpack(value: string): StatePayload {
    const dot = value.indexOf('.');
    if (dot <= 0) throw new GoogleOAuthError(GoogleOAuthErrorCodes.OAUTH_STATE_INVALID, 'Invalid state cookie.');
    const encoded = value.slice(0, dot);
    const signature = value.slice(dot + 1);
    const expected = this.signPayload(encoded);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new GoogleOAuthError(GoogleOAuthErrorCodes.OAUTH_STATE_INVALID, 'Invalid state cookie.');
    const payload = base64UrlDecodeJson<StatePayload>(encoded);
    if (
      typeof payload.state !== 'string' ||
      typeof payload.codeVerifier !== 'string' ||
      typeof payload.exp !== 'number'
    )
      throw new GoogleOAuthError(GoogleOAuthErrorCodes.OAUTH_STATE_INVALID, 'Invalid state cookie.');
    return payload;
  }

  private cookieOptions(maxAge: number) {
    return {
      name: GOOGLE_OAUTH_STATE_COOKIE,
      httpOnly: true,
      secure: this.config.getOrThrow('AUTH_COOKIE_SECURE', { infer: true }),
      sameSite: 'lax' as const,
      path: '/',
      maxAge,
    };
  }

  createStart(options?: {
    next?: string;
    mode?: 'login' | 'link';
    linkUserId?: string;
  }): {
    state: string;
    codeChallenge: string;
    setCookie: string;
  } {
    if (options?.mode === 'link' && !options.linkUserId)
      throw new GoogleOAuthError(
        GoogleOAuthErrorCodes.OAUTH_STATE_INVALID,
        'Link flow requires a user id.',
      );
    const ttl = this.stateTtlSeconds();
    const state = base64Url(randomBytes(32));
    const codeVerifier = generateCodeVerifier();
    const next = oauthReturnPath(options?.next);
    const exp = Math.floor(Date.now() / 1000) + ttl;
    const payload: StatePayload = {
      state,
      codeVerifier,
      exp,
      ...(next ? { next } : {}),
      ...(options?.mode ? { mode: options.mode } : {}),
      ...(options?.linkUserId ? { linkUserId: options.linkUserId } : {}),
    };
    const setCookie = stringifySetCookie({
      ...this.cookieOptions(ttl),
      value: this.pack(payload),
    });
    return { state, codeChallenge: codeChallengeS256(codeVerifier), setCookie };
  }

  readStart(req: Request): StatePayload {
    const raw = parseCookie(req.headers.cookie ?? '')[GOOGLE_OAUTH_STATE_COOKIE];
    if (!raw) throw new GoogleOAuthError(GoogleOAuthErrorCodes.OAUTH_STATE_INVALID, 'Missing state cookie.');
    return this.unpack(raw);
  }

  validateCallback(
    req: Request,
    queryState: string,
  ): {
    codeVerifier: string;
    next?: string;
    mode?: 'login' | 'link';
    linkUserId?: string;
  } {
    const payload = this.readStart(req);
    if (payload.exp * 1000 < Date.now())
      throw new GoogleOAuthError(GoogleOAuthErrorCodes.OAUTH_STATE_INVALID, 'State expired.');
    const a = Buffer.from(queryState);
    const b = Buffer.from(payload.state);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new GoogleOAuthError(GoogleOAuthErrorCodes.OAUTH_STATE_INVALID, 'State mismatch.');
    return {
      codeVerifier: payload.codeVerifier,
      next: payload.next,
      mode: payload.mode,
      linkUserId: payload.linkUserId,
    };
  }

  clearCookie(res: Response): void {
    res.appendHeader(
      'Set-Cookie',
      stringifySetCookie({
        ...this.cookieOptions(0),
        value: '',
        expires: new Date(0),
      }),
    );
  }
}