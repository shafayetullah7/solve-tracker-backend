import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import type { Environment } from '../../config/environment.js';
import {
  GOOGLE_ID_TOKEN_ISSUERS,
  GOOGLE_OAUTH_AUTHORIZE_URL,
  GOOGLE_OAUTH_DEFAULT_SCOPES,
  GOOGLE_OAUTH_TOKEN_URL,
} from './google-oauth.constants.js';
import {
  GoogleOAuthError,
  GoogleOAuthErrorCodes,
} from './google-oauth.errors.js';
import { GoogleJwksCache } from './google-jwks.cache.js';

const googleIdTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().trim().pipe(z.email()),
  email_verified: z.boolean(),
  name: z.string().trim().optional(),
});

export type VerifiedGoogleProfile = {
  subject: string;
  email: string;
  name?: string;
};

@Injectable()
export class GoogleOAuthService {
  private fetchFn: typeof fetch = fetch;

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly jwks: GoogleJwksCache,
  ) {}

  /** Unit tests only. */
  useFetchForTests(fetchFn: typeof fetch): void {
    this.fetchFn = fetchFn;
  }

  isEnabled(): boolean {
    return this.config.getOrThrow('GOOGLE_OAUTH_ENABLED', { infer: true });
  }

  private requireEnabled(): void {
    if (!this.isEnabled())
      throw new GoogleOAuthError(
        GoogleOAuthErrorCodes.OAUTH_DISABLED,
        'Google OAuth is not enabled.',
      );
  }

  clientId(): string {
    this.requireEnabled();
    const id = this.config.get('GOOGLE_OAUTH_CLIENT_ID');
    if (!id)
      throw new GoogleOAuthError(
        GoogleOAuthErrorCodes.OAUTH_MISCONFIGURED,
        'Google client id is not configured.',
      );
    return id;
  }

  private clientSecret(): string {
    this.requireEnabled();
    const secret = this.config.get('GOOGLE_OAUTH_CLIENT_SECRET');
    if (!secret)
      throw new GoogleOAuthError(
        GoogleOAuthErrorCodes.OAUTH_MISCONFIGURED,
        'Google client secret is not configured.',
      );
    return secret;
  }

  private redirectUri(): string {
    this.requireEnabled();
    const uri = this.config.get('GOOGLE_OAUTH_REDIRECT_URI');
    if (!uri)
      throw new GoogleOAuthError(
        GoogleOAuthErrorCodes.OAUTH_MISCONFIGURED,
        'Google redirect URI is not configured.',
      );
    return uri;
  }

  scopes(): string {
    return (
      this.config.get('GOOGLE_OAUTH_SCOPES') ?? GOOGLE_OAUTH_DEFAULT_SCOPES
    );
  }

  buildAuthorizationUrl(params: {
    state: string;
    codeChallenge: string;
  }): string {
    this.requireEnabled();
    const url = new URL(GOOGLE_OAUTH_AUTHORIZE_URL);
    url.searchParams.set('client_id', this.clientId());
    url.searchParams.set('redirect_uri', this.redirectUri());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', this.scopes());
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    const prompt = this.config.get('GOOGLE_OAUTH_PROMPT');
    if (prompt) url.searchParams.set('prompt', prompt);
    return url.toString();
  }

  async exchangeCodeForIdToken(
    code: string,
    codeVerifier: string,
  ): Promise<string> {
    this.requireEnabled();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      redirect_uri: this.redirectUri(),
      code_verifier: codeVerifier,
    });
    const response = await this.fetchFn(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok)
      throw new GoogleOAuthError(
        GoogleOAuthErrorCodes.OAUTH_TOKEN_EXCHANGE_FAILED,
        'Google token exchange failed.',
      );
    const json = (await response.json()) as { id_token?: string };
    if (!json.id_token)
      throw new GoogleOAuthError(
        GoogleOAuthErrorCodes.OAUTH_TOKEN_EXCHANGE_FAILED,
        'Google token response missing id_token.',
      );
    return json.id_token;
  }

  async verifyIdToken(
    idToken: string,
    keySetOverride?: JWTVerifyGetKey,
  ): Promise<VerifiedGoogleProfile> {
    this.requireEnabled();
    let keySet: JWTVerifyGetKey;
    try {
      keySet = keySetOverride ?? (await this.jwks.getKeySet());
    } catch {
      throw new GoogleOAuthError(
        GoogleOAuthErrorCodes.OAUTH_ID_TOKEN_INVALID,
        'Unable to load Google signing keys.',
      );
    }
    try {
      const { payload } = await jwtVerify(idToken, keySet, {
        algorithms: ['RS256'],
        audience: this.clientId(),
        issuer: [...GOOGLE_ID_TOKEN_ISSUERS],
      });
      const claims = googleIdTokenClaimsSchema.parse(payload);
      if (!claims.email_verified)
        throw new GoogleOAuthError(
          GoogleOAuthErrorCodes.OAUTH_EMAIL_UNVERIFIED,
          'Google email is not verified.',
        );
      const email = claims.email.trim().toLowerCase();
      return {
        subject: claims.sub,
        email,
        ...(claims.name ? { name: claims.name.trim() } : {}),
      };
    } catch (error) {
      if (error instanceof GoogleOAuthError) throw error;
      throw new GoogleOAuthError(
        GoogleOAuthErrorCodes.OAUTH_ID_TOKEN_INVALID,
        'Google id_token verification failed.',
      );
    }
  }
}