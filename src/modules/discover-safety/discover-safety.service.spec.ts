import { BadRequestException, HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DiscoverSafetyService } from './discover-safety.service.js';

function makeService(overrides?: {
  subject?: { userId: string; handle: string; visibility: string };
}) {
  const subject =
    overrides?.subject ??
    ({
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      handle: 'peer',
      visibility: 'summary',
      publicWeb: false,
    } as never);
  const safety = {
    insertBlock: vi.fn(),
    deleteBlock: vi.fn(),
    isBlocked: vi.fn(async () => false),
    listBlockedIds: vi.fn(async () => []),
    insertReport: vi.fn(),
  };
  const subjects = { findByHandle: vi.fn(async () => subject) };
  return { service: new DiscoverSafetyService(safety as never, subjects as never), safety };
}

describe('DiscoverSafetyService', () => {
  it('rejects self-block', async () => {
    const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const { service } = makeService({
      subject: { userId, handle: 'me', visibility: 'summary' } as never,
    });
    await expect(service.block(userId, 'me')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('blocks viewable subject', async () => {
    const { service, safety } = makeService();
    await service.block('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'peer');
    expect(safety.insertBlock).toHaveBeenCalled();
  });

  it('rejects report on private subject', async () => {
    const { service } = makeService({
      subject: {
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        handle: 'hidden',
        visibility: 'private',
      } as never,
    });
    await expect(
      service.report(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'hidden',
        'spam',
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });
});