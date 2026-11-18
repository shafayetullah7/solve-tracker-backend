import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { systemHandleFromUserId } from '../../common/schemas/user-handle-assign.js';
import { USER_HANDLE_ERROR } from '../../common/schemas/user-handle.errors.js';
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

function buildAuthService(repo: AuthRepository) {
  const config = new ConfigService<Environment, true>(environment());
  const stubs = {
    repo,
    passwords: { hash: vi.fn(async () => 'hash') } as unknown as PasswordService,
    tokens: {} as TokenService,
    email: {} as EmailService,
    identities: {} as AuthProviderIdentityRepository,
    limiter: { check: () => 0 },
    config,
  };
  return new AuthService(
    stubs.repo,
    stubs.identities,
    stubs.passwords,
    stubs.tokens,
    stubs.email,
    stubs.config,
    stubs.limiter as never,
  );
}

describe('AuthService createUserAccount', () => {
  it('persists chosen handle lowercase', async () => {
    const created: unknown[] = [];
    const repo = {
      createUser: vi.fn(async (values) => {
        created.push(values);
        return values;
      }),
    } as unknown as AuthRepository;
    const service = buildAuthService(repo);
    // @ts-expect-error private
    const user = await service.createUserAccount({
      name: 'A',
      email: 'a@example.test',
      passwordHash: 'hash',
      handle: 'my_handle',
    });
    expect(user.handle).toBe('my_handle');
    expect(created[0]).toMatchObject({ handle: 'my_handle' });
  });

  it('assigns system handle from id when omitted', async () => {
    let id: string | undefined;
    const repo = {
      createUser: vi.fn(async (values) => {
        id = values.id;
        return values;
      }),
    } as unknown as AuthRepository;
    const service = buildAuthService(repo);
    // @ts-expect-error private
    const user = await service.createUserAccount({
      name: 'A',
      email: 'b@example.test',
      passwordHash: 'hash',
    });
    expect(id).toBeDefined();
    expect(user.handle).toBe(systemHandleFromUserId(id!));
  });

  it('throws HANDLE_IN_USE when chosen handle conflicts', async () => {
    const uniqueErr = Object.assign(new Error('dup'), {
      code: '23505',
      constraint: 'users_handle_lower_uniq',
    });
    const repo = {
      createUser: vi.fn(async () => {
        throw uniqueErr;
      }),
    } as unknown as AuthRepository;
    const service = buildAuthService(repo);
    try {
      // @ts-expect-error private
      await service.createUserAccount({
        name: 'A',
        email: `${randomUUID()}@example.test`,
        passwordHash: 'hash',
        handle: 'taken',
      });
      expect.fail('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        code: USER_HANDLE_ERROR.IN_USE,
      });
    }
  });
});