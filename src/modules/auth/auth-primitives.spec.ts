import { ConfigService } from '@nestjs/config';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import { environmentSchema } from '../../config/environment.js';
import type { Environment } from '../../config/environment.js';
import { authTestEnvironment } from '../../../test/auth-env.js';
import { TokenService } from './token.service.js';
import { PasswordService } from './password.service.js';
import { AuthLimiter } from './auth-security.guard.js';
import { registerSchema, passwordSchema } from './schemas/auth.schema.js';
const environment = () =>
  environmentSchema.parse({
    ...authTestEnvironment,
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '3000',
    DATABASE_URL: 'postgresql://test:test@localhost/test',
    SWAGGER_ENABLED: 'false',
  });
const config = () => new ConfigService<Environment, true>(environment());
describe('auth primitives', () => {
  it('normalizes user fields and measures Unicode code points', () => {
    expect(
      registerSchema.parse({
        name: '  Jane  ',
        email: ' JANE@example.com ',
        password: '🌱'.repeat(8),
      }),
    ).toMatchObject({ name: 'Jane', email: 'jane@example.com' });
    expect(passwordSchema.safeParse('🌱'.repeat(7)).success).toBe(false);
    expect(passwordSchema.safeParse('🌱'.repeat(8)).success).toBe(true);
    expect(passwordSchema.safeParse('🌱'.repeat(128)).success).toBe(true);
    expect(passwordSchema.safeParse('🌱'.repeat(129)).success).toBe(false);
    expect(
      registerSchema.safeParse({
        name: 'x',
        email: 'x@example.com',
        password: 'x'.repeat(8),
        role: 'admin',
      }).success,
    ).toBe(false);
  });
  it('generates independently salted Argon2id hashes and verifies', async () => {
    const service = new PasswordService(config());
    const value = 'the long testing password';
    const first = await service.hash(value),
      second = await service.hash(value);
    expect(first).toMatch(/^\$argon2id\$/);
    expect(first).not.toBe(second);
    expect(await service.verify(value, first)).toBe(true);
    expect(await service.verify('incorrect', first)).toBe(false);
    expect(await service.verify(value)).toBe(false);
  });
  it('separates JWT purposes, secrets, and absolute deadlines', async () => {
    const service = new TokenService(config());
    const userId = randomUUID(),
      sid = randomUUID();
    const end = new Date(Date.now() + 60000);
    const pair = await service.issue(userId, sid, end);
    expect((await service.verify(pair.access, 'access')).sub).toBe(userId);
    expect((await service.verify(pair.refresh, 'refresh')).sid).toBe(sid);
    expect(pair.accessExpiresAt.getTime()).toBeLessThanOrEqual(end.getTime());
    await expect(service.verify(pair.refresh, 'access')).rejects.toBeDefined();
    await expect(service.verify(pair.access, 'refresh')).rejects.toBeDefined();
  });
  it.each(['issuer', 'audience', 'purpose', 'expired', 'algorithm'])(
    'rejects wrong JWT %s',
    async (variant) => {
      const c = config();
      const token = await new SignJWT({
        sid: randomUUID(),
        purpose: variant === 'purpose' ? 'refresh' : 'access',
      })
        .setSubject(randomUUID())
        .setJti(randomUUID())
        .setIssuer(variant === 'issuer' ? 'wrong' : c.getOrThrow('JWT_ISSUER'))
        .setAudience(
          variant === 'audience' ? 'wrong' : c.getOrThrow('JWT_AUDIENCE'),
        )
        .setIssuedAt()
        .setExpirationTime(variant === 'expired' ? '0s' : '1m')
        .setProtectedHeader({
          alg: variant === 'algorithm' ? 'HS384' : 'HS256',
          typ: 'access+jwt',
        })
        .sign(new TextEncoder().encode(c.getOrThrow('JWT_ACCESS_SECRET')));
      await expect(
        new TokenService(c).verify(token, 'access'),
      ).rejects.toBeDefined();
    },
  );
  it('bounds attempts and releases expired buckets', () => {
    vi.useFakeTimers();
    try {
      const limiter = new AuthLimiter();
      expect(limiter.check('key', 1, 1000)).toBe(0);
      expect(limiter.check('key', 1, 1000)).toBe(1);
      vi.advanceTimersByTime(1001);
      expect(limiter.check('key', 1, 1000)).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it('rejects unsafe production configuration', () => {
    expect(
      environmentSchema.safeParse({
        ...authTestEnvironment,
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: '3000',
        DATABASE_URL: 'postgresql://test:test@localhost/test',
        SWAGGER_ENABLED: 'false',
      }).success,
    ).toBe(false);
  });
});
