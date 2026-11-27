import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { Environment } from '../../config/environment.js';
import { authTestEnvironment } from '../../../test/auth-env.js';
import { AuthService } from './auth.service.js';
import type { AuthRepository } from './auth.repository.js';
import type { AuthProviderIdentityRepository } from './google/auth-provider-identity.repository.js';
import type { PasswordService } from './password.service.js';
import type { TokenService } from './token.service.js';
import type { EmailService } from '../email/email.service.js';

function environment(): Environment {
  return {
    ...authTestEnvironment,
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '3000',
    DATABASE_URL: 'postgresql://test:test@localhost/test',
    SWAGGER_ENABLED: 'false',
  } as Environment;
}

function buildAuthService(deps: {
  repo: AuthRepository;
  passwords: PasswordService;
}) {
  const config = new ConfigService<Environment, true>(environment());
  return new AuthService(
    deps.repo,
    {} as AuthProviderIdentityRepository,
    deps.passwords,
    {} as TokenService,
    {} as EmailService,
    config,
    { check: () => 0 } as never,
  );
}

describe('AuthService.eraseAccount', () => {
  it('rejects when the password is wrong', async () => {
    const repo = {
      withUser: vi.fn(async (_id, operation) => {
        const user = {
          id: 'user-1',
          passwordHash: 'hash',
        };
        return operation({} as never, user as never);
      }),
    } as unknown as AuthRepository;
    const passwords = {
      verify: vi.fn(async () => false),
    } as unknown as PasswordService;
    const service = buildAuthService({ repo, passwords });
    try {
      await service.eraseAccount('user-1', { password: 'wrong passphrase' });
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(401);
    }
  });

  it('rejects Google-only accounts without a password', async () => {
    const repo = {
      withUser: vi.fn(async (_id, operation) => {
        const user = { id: 'user-1', passwordHash: null };
        return operation({} as never, user as never);
      }),
    } as unknown as AuthRepository;
    const passwords = {
      verify: vi.fn(),
    } as unknown as PasswordService;
    const service = buildAuthService({ repo, passwords });
    try {
      await service.eraseAccount('user-1', { password: 'any passphrase' });
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(403);
    }
    expect(passwords.verify).not.toHaveBeenCalled();
  });

  it('deletes the user when the password verifies', async () => {
    const deleteFn = vi.fn(async () => undefined);
    const repo = {
      withUser: vi.fn(async (_id, operation) => {
        const user = { id: 'user-1', passwordHash: 'hash' };
        const tx = { delete: () => ({ where: deleteFn }) };
        return operation(tx as never, user as never);
      }),
    } as unknown as AuthRepository;
    const passwords = {
      verify: vi.fn(async () => true),
    } as unknown as PasswordService;
    const service = buildAuthService({ repo, passwords });
    // @ts-expect-error test spy
    service.revokeAllSessionsForUser = vi.fn(async () => 1);
    await service.eraseAccount('user-1', { password: 'correct passphrase' });
    expect(deleteFn).toHaveBeenCalled();
  });
});