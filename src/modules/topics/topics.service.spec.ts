import { describe, expect, it, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { TopicsService } from './topics.service.js';
import type { TopicsRepository } from './topics.repository.js';

const topic = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  name: 'Arrays',
  normalizedName: 'arrays',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('TopicsService', () => {
  it('maps empty name to validation error', async () => {
    const repo = {} as TopicsRepository;
    const service = new TopicsService(repo);
    await expect(service.create('u', '   ')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    });
  });

  it('maps duplicate insert to TOPIC_NAME_IN_USE', async () => {
    const repo = {
      insert: vi.fn().mockRejectedValue({
        cause: { code: '23505', constraint: 'topics_user_normalized_name_uniq' },
      }),
    } as unknown as TopicsRepository;
    const service = new TopicsService(repo);
    await expect(service.create('u', 'Arrays')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'TOPIC_NAME_IN_USE' }),
    });
  });

  it('returns NOT_FOUND when delete misses', async () => {
    const repo = {
      delete: vi.fn().mockResolvedValue(false),
    } as unknown as TopicsRepository;
    const service = new TopicsService(repo);
    await expect(
      service.remove('u', '11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(HttpException);
    await expect(
      service.remove('u', '11111111-1111-4111-8111-111111111111'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'NOT_FOUND' }),
    });
  });

  it('creates and maps response', async () => {
    const repo = {
      insert: vi.fn().mockResolvedValue(topic),
    } as unknown as TopicsRepository;
    const service = new TopicsService(repo);
    await expect(service.create('u', 'Arrays')).resolves.toEqual({
      id: topic.id,
      name: 'Arrays',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });
});