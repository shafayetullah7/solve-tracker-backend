import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import {
  GOOGLE_JWKS_CACHE_TTL_MS,
  GOOGLE_JWKS_FETCH_TIMEOUT_MS,
  GOOGLE_OPENID_CONFIGURATION_URL,
} from './google-oauth.constants.js';

type OpenIdConfiguration = { jwks_uri?: string };

@Injectable()
export class GoogleJwksCache {
  private keySet?: JWTVerifyGetKey;
  private jwksUri?: string;
  private cachedAt = 0;
  private fetchFn: typeof fetch = fetch;

  private async resolveJwksUri(): Promise<string> {
    if (
      this.jwksUri &&
      Date.now() - this.cachedAt < GOOGLE_JWKS_CACHE_TTL_MS
    )
      return this.jwksUri;
    const response = await this.fetchFn(GOOGLE_OPENID_CONFIGURATION_URL, {
      signal: AbortSignal.timeout(GOOGLE_JWKS_FETCH_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error('Failed to load Google OpenID configuration.');
    const body = (await response.json()) as OpenIdConfiguration;
    if (!body.jwks_uri) throw new Error('Google jwks_uri missing.');
    this.jwksUri = body.jwks_uri;
    this.cachedAt = Date.now();
    return this.jwksUri;
  }

  /** Returns a JWKS resolver for `jwtVerify`. Tests may inject a local key set instead. */
  async getKeySet(): Promise<JWTVerifyGetKey> {
    if (
      this.keySet &&
      Date.now() - this.cachedAt < GOOGLE_JWKS_CACHE_TTL_MS
    )
      return this.keySet;
    const uri = await this.resolveJwksUri();
    this.keySet = createRemoteJWKSet(new URL(uri), {
      timeoutDuration: GOOGLE_JWKS_FETCH_TIMEOUT_MS,
      cooldownDuration: GOOGLE_JWKS_CACHE_TTL_MS,
    });
    this.cachedAt = Date.now();
    return this.keySet;
  }

  /** Unit tests only — bypass remote JWKS. */
  useKeySetForTests(keySet: JWTVerifyGetKey): void {
    this.keySet = keySet;
    this.cachedAt = Date.now();
  }
}