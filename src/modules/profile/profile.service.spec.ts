import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { USER_HANDLE_CHANGE_COOLDOWN_MS } from '../../common/schemas/user-handle-assign.js';
import { USER_HANDLE_ERROR } from '../../common/schemas/user-handle.errors.js';
import type { User } from '../../database/schema/index.js';
import type { UserLockRepository } from '../../database/user-lock.repository.js';
import type { MediaService } from '../media/media.service.js';
import { ProfileService } from './profile.service.js';
import type { ProfileRepository } from './profile.repository.js';

const userId = '11111111-1111-4111-8111-111111111111';

function baseUser(overrides: Partial<User> = {}): User {
  return {
    id: userId,
    name: 'Test',
    email: 'test@example.test',
    passwordHash: 'hash',
    handle: 'ua1b2c3d4e5f64789a012345',
    handleChangedAt: null,
    bio: '',
    avatarMediaId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildService(
  user: User,
  updateImpl: (set: Record<string, unknown>) => Promise<User> | User,
) {
  const userLock = {
    withLockedUser: vi.fn(
      async (
        _id: string,
        operation: (tx: unknown, u: User) => Promise<unknown>,
      ) => {
        const tx = {
          update: () => ({
            set: (set: Record<string, unknown>) => ({
              where: () => ({
                returning: async () => [await updateImpl(set)],
              }),
            }),
          }),
        };
        return operation(tx, user);
      },
    ),
  } as unknown as UserLockRepository;
  const profiles = {
    listWork: vi.fn().mockResolvedValue([]),
    listEducation: vi.fn().mockResolvedValue([]),
  } as unknown as ProfileRepository;
  const media = { deliveryUrl: vi.fn() } as unknown as MediaService;
  return new ProfileService(profiles, userLock, media);
}

describe('ProfileService handle patch', () => {
  it('updates handle and sets handle_changed_at', async () => {
    let captured: Record<string, unknown> = {};
    const service = buildService(baseUser(), (set) => {
      captured = set;
      return { ...baseUser(), ...set, handle: 'new_handle' as string };
    });
    const result = await service.patchProfile(userId, { handle: 'new_handle' });
    expect(result.handle).toBe('new_handle');
    expect(captured.handle).toBe('new_handle');
    expect(captured.handleChangedAt).toBeInstanceOf(Date);
  });

  it('does not bump handle_changed_at when handle unchanged', async () => {
    let captured: Record<string, unknown> = {};
    const service = buildService(baseUser(), (set) => {
      captured = set;
      return baseUser();
    });
    await service.patchProfile(userId, { handle: 'ua1b2c3d4e5f64789a012345' });
    expect(captured.handle).toBeUndefined();
    expect(captured.handleChangedAt).toBeUndefined();
  });

  it('rejects change within cooldown', async () => {
    const recent = new Date(Date.now() - 60_000);
    const service = buildService(
      baseUser({ handleChangedAt: recent }),
      () => baseUser(),
    );
    await expect(
      service.patchProfile(userId, { handle: 'other_handle' }),
    ).rejects.toMatchObject({
      response: { code: USER_HANDLE_ERROR.CHANGE_COOLDOWN },
    });
    expect(USER_HANDLE_CHANGE_COOLDOWN_MS).toBeGreaterThan(60_000);
  });

  it('maps unique violation to HANDLE_IN_USE', async () => {
    const uniqueErr = Object.assign(new Error('dup'), {
      code: '23505',
      constraint: 'users_handle_lower_uniq',
    });
    const userLock = {
      withLockedUser: vi.fn(async (_id, operation) => {
        const tx = {
          update: () => ({
            set: () => ({
              where: () => ({
                returning: async () => {
                  throw uniqueErr;
                },
              }),
            }),
          }),
        };
        return operation(tx, baseUser());
      }),
    } as unknown as UserLockRepository;
    const profiles = {
      listWork: vi.fn(),
      listEducation: vi.fn(),
    } as unknown as ProfileRepository;
    const service = new ProfileService(
      profiles,
      userLock,
      { deliveryUrl: vi.fn() } as unknown as MediaService,
    );
    try {
      await service.patchProfile(userId, { handle: 'taken_handle' });
      expect.fail('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        code: USER_HANDLE_ERROR.IN_USE,
      });
    }
  });
});