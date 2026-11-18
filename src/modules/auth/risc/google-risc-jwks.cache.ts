import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import type { Environment } from '../../../config/environment.js';
import {
  GOOGLE_RISC_CONFIGURATION_URL,
  GOOGLE_RISC_JWKS_CACHE_TTL_MS,
  GOOGLE_RISC_JWKS_FETCH_TIMEOUT_MS,
} from './google-risc.constants.js';

type RiscConfiguration = { jwks_uri?: string; issuer?: string };

@Injectable()
export class GoogleRiscJwksCache {
  private keySet?: JWTVerifyGetKey;
  private jwksUri?: string;
  private cachedAt = 0;
  private fetchFn: typeof fetch = fetch;

  constructor(private readonly config: ConfigService<Environment, true>) {}

  private configurationUrl(): string {
    return (
      this.config.get('GOOGLE_RISC_JWKS_URL') ?? GOOGLE_RISC_CONFIGURATION_URL
    );
  }

  private async resolveJwksUri(): Promise<string> {
    if (this.jwksUri && Date.now() - this.cachedAt < GOOGLE_RISC_JWKS_CACHE_TTL_MS)
      return this.jwksUri;
    const response = await this.fetchFn(this.configurationUrl(), {
      signal: AbortSignal.timeout(GOOGLE_RISC_JWKS_FETCH_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error('Failed to load Google RISC configuration.');
    const body = (await response.json()) as RiscConfiguration;
    if (!body.jwks_uri) throw new Error('Google RISC jwks_uri missing.');
    this.jwksUri = body.jwks_uri;
    this.cachedAt = Date.now();
    return this.jwksUri;
  }

  async getKeySet(): Promise<JWTVerifyGetKey> {
    if (this.keySet && Date.now() - this.cachedAt < GOOGLE_RISC_JWKS_CACHE_TTL_MS)
      return this.keySet;
    const uri = await this.resolveJwksUri();
    this.keySet = createRemoteJWKSet(new URL(uri), {
      timeoutDuration: GOOGLE_RISC_JWKS_FETCH_TIMEOUT_MS,
      cooldownDuration: GOOGLE_RISC_JWKS_CACHE_TTL_MS,
    });
    this.cachedAt = Date.now();
    return this.keySet;
  }

  /** Unit tests only — bypass remote JWKS. */
  useKeySetForTests(keySet: JWTVerifyGetKey): void {
    this.keySet = keySet;
    this.cachedAt = Date.now();
  }

  /** Unit tests only. */
  useFetchForTests(fetchFn: typeof fetch): void {
    this.fetchFn = fetchFn;
  }
}