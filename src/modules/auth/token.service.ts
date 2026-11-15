import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Environment } from '../../config/environment.js';
const claimsSchema = z.object({
  sub: z.uuid(),
  sid: z.uuid(),
  jti: z.uuid(),
  purpose: z.enum(['access', 'refresh']),
  iat: z.number().int(),
  exp: z.number().int(),
});
export type Claims = z.infer<typeof claimsSchema>;
export const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export const sameDigest = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export interface Tokens {
  access: string;
  refresh: string;
  accessExpiresAt: Date;
  expiresAt: Date;
}
@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  private key(purpose: 'access' | 'refresh') {
    return new TextEncoder().encode(
      this.config.getOrThrow(
        purpose === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET',
        { infer: true },
      ),
    );
  }
  async verify(token: string, purpose: 'access' | 'refresh'): Promise<Claims> {
    const { payload, protectedHeader } = await jwtVerify(
      token,
      this.key(purpose),
      {
        algorithms: ['HS256'],
        issuer: this.config.getOrThrow('JWT_ISSUER', { infer: true }),
        audience: this.config.getOrThrow('JWT_AUDIENCE', { infer: true }),
        requiredClaims: ['sub', 'sid', 'jti', 'purpose', 'iat', 'exp'],
      },
    );
    const claims = claimsSchema.parse(payload);
    if (claims.purpose !== purpose || protectedHeader.typ !== `${purpose}+jwt`)
      throw new Error('Wrong token purpose');
    return claims;
  }
  async issue(
    userId: string,
    sessionId: string,
    expiresAt: Date,
  ): Promise<Tokens> {
    const now = Math.floor(Date.now() / 1000),
      end = Math.floor(expiresAt.getTime() / 1000);
    const accessEnd = Math.min(
      end,
      now + this.config.getOrThrow('JWT_ACCESS_TTL_SECONDS', { infer: true }),
    );
    const sign = (purpose: 'access' | 'refresh', exp: number) =>
      new SignJWT({ sid: sessionId, purpose })
        .setProtectedHeader({ alg: 'HS256', typ: `${purpose}+jwt` })
        .setSubject(userId)
        .setJti(randomUUID())
        .setIssuer(this.config.getOrThrow('JWT_ISSUER', { infer: true }))
        .setAudience(this.config.getOrThrow('JWT_AUDIENCE', { infer: true }))
        .setIssuedAt(now)
        .setExpirationTime(exp)
        .sign(this.key(purpose));
    return {
      access: await sign('access', accessEnd),
      refresh: await sign('refresh', end),
      accessExpiresAt: new Date(accessEnd * 1000),
      expiresAt: new Date(end * 1000),
    };
  }
}
