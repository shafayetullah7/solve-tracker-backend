import { BadRequestException, HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { FollowsService } from './follows.service.js';

function makeService(overrides?: {
  subject?: { userId: string; handle: string; visibility: string };
  following?: boolean;
}) {
  const follows = {
    insertFollow: vi.fn(),
    deleteFollow: vi.fn(),
    isFollowing: vi.fn(async () => overrides?.following ?? false),
    listFolloweeIds: vi.fn(async () => ({ ids: [], total: 0 })),
    countFollowers: vi.fn(async () => 0),
  };
  const subject =
    overrides?.subject ??
    ({
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      handle: 'peer',
      visibility: 'summary',
    } as never);
  const subjects = {
    findByHandle: vi.fn(async () => subject),
  };
  const discover = {
    loadPersonSnapshots: vi.fn(async () => []),
  };
  const media = {
    findOwnedRecord: vi.fn(),
    deliveryUrl: vi.fn(),
  };
  const service = new FollowsService(
    follows as never,
    subjects as never,
    discover as never,
    media as never,
  );
  return { service, follows, subjects };
}

describe('FollowsService', () => {
  it('rejects self-follow', async () => {
    const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const { service } = makeService({
      subject: {
        userId,
        handle: 'me',
        visibility: 'summary',
      } as never,
    });
    await expect(service.follow(userId, 'me')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects starter handle', async () => {
    const { service } = makeService();
    await expect(
      service.follow('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'starter'),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('rejects private targets', async () => {
    const { service } = makeService({
      subject: {
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        handle: 'hidden',
        visibility: 'private',
      } as never,
    });
    await expect(
      service.follow('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'hidden'),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('inserts follow for viewable subject', async () => {
    const { service, follows } = makeService();
    await service.follow('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'peer');
    expect(follows.insertFollow).toHaveBeenCalledWith(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    );
  });

  it('unfollow is idempotent without subject', async () => {
    const { service, follows, subjects } = makeService();
    subjects.findByHandle.mockResolvedValueOnce(undefined);
    await service.unfollow('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'missing');
    expect(follows.deleteFollow).not.toHaveBeenCalled();
  });
});