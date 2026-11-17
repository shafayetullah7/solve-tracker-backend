import { describe, expect, it, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { ProblemsService } from './problems.service.js';
import type { ProblemsRepository } from './problems.repository.js';

const problem = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  title: 'Two Sum',
  url: 'https://leetcode.com/problems/two-sum/',
  normalizedUrl: 'https://leetcode.com/problems/two-sum/',
  platformSlug: 'leetcode',
  platformProblemId: null,
  difficulty: null,
  rating: null,
  notes: null,
  status: 'unsolved' as const,
  solvedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('ProblemsService', () => {
  it('maps empty title to validation error', async () => {
    const repo = {} as ProblemsRepository;
    const service = new ProblemsService(repo);
    await expect(
      service.create('u', {
        title: '   ',
        url: 'https://example.com/p',
        topicIds: [],
        status: 'unsolved',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    });
  });

  it('maps duplicate insert to PROBLEM_URL_IN_USE', async () => {
    const repo = {
      countOwnedTopics: vi.fn().mockResolvedValue(0),
      createWithTopics: vi.fn().mockRejectedValue({
        cause: { code: '23505', constraint: 'problems_user_normalized_url_uniq' },
      }),
      findIdByNormalizedUrl: vi.fn().mockResolvedValue(problem.id),
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    await expect(
      service.create('u', {
        title: 'T',
        url: 'https://example.com/p',
        topicIds: [],
        status: 'unsolved',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'PROBLEM_URL_IN_USE',
        details: { existingProblemId: problem.id },
      }),
    });
  });

  it('rejects foreign topic ids', async () => {
    const repo = {
      countOwnedTopics: vi.fn().mockResolvedValue(0),
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    await expect(
      service.create('u', {
        title: 'T',
        url: 'https://example.com/p',
        topicIds: ['33333333-3333-4333-8333-333333333333'],
        status: 'unsolved',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'VALIDATION_ERROR',
        details: { topicIds: expect.any(String) },
      }),
    });
  });

  it('sets platformSlug on create for catalog URL', async () => {
    const createWithTopics = vi.fn().mockResolvedValue({
      problem: { ...problem, platformSlug: 'leetcode' },
      topics: [],
    });
    const repo = {
      countOwnedTopics: vi.fn().mockResolvedValue(0),
      createWithTopics,
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    await service.create('u', {
      title: 'T',
      url: 'https://leetcode.com/problems/two-sum/',
      topicIds: [],
      status: 'unsolved',
    });
    const row = createWithTopics.mock.calls[0][1];
    expect(row.platformSlug).toBe('leetcode');
  });

  it('sets platformSlug to other for unknown host on create', async () => {
    const createWithTopics = vi.fn().mockResolvedValue({
      problem: { ...problem, platformSlug: 'other', url: 'https://example.com/p' },
      topics: [],
    });
    const repo = {
      countOwnedTopics: vi.fn().mockResolvedValue(0),
      createWithTopics,
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    await service.create('u', {
      title: 'T',
      url: 'https://example.com/p',
      topicIds: [],
      status: 'unsolved',
    });
    expect(createWithTopics.mock.calls[0][1].platformSlug).toBe('other');
  });

  it('updates platformSlug when url changes', async () => {
    const updateWithTopics = vi.fn().mockResolvedValue({
      problem: { ...problem, platformSlug: 'other' },
      topics: [],
    });
    const repo = {
      updateWithTopics,
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    await service.update('u', problem.id, {
      url: 'https://example.com/new-path',
    });
    const patch = updateWithTopics.mock.calls[0][2];
    expect(patch.url).toBe('https://example.com/new-path');
    expect(patch.platformSlug).toBe('other');
  });

  it('omits platformSlug when url is not patched', async () => {
    const updateWithTopics = vi.fn().mockResolvedValue({
      problem: { ...problem, title: 'Renamed' },
      topics: [],
    });
    const repo = {
      updateWithTopics,
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    await service.update('u', problem.id, { title: 'Renamed' });
    const patch = updateWithTopics.mock.calls[0][2];
    expect(patch.title).toBe('Renamed');
    expect(patch).not.toHaveProperty('platformSlug');
  });

  it('passes solvedAt when creating solved problem', async () => {
    const createWithTopics = vi.fn().mockResolvedValue({
      problem: { ...problem, status: 'solved', solvedAt: new Date() },
      topics: [],
    });
    const repo = {
      countOwnedTopics: vi.fn().mockResolvedValue(0),
      createWithTopics,
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    await service.create('u', {
      title: 'T',
      url: 'https://example.com/p',
      topicIds: [],
      status: 'solved',
    });
    const row = createWithTopics.mock.calls[0][1];
    expect(row.status).toBe('solved');
    expect(row.solvedAt).toBeInstanceOf(Date);
  });

  it('marks problem solved on status patch', async () => {
    const solvedAt = new Date('2026-06-15T10:00:00.000Z');
    const findDetailed = vi.fn().mockResolvedValue({
      problem: { ...problem, status: 'unsolved', solvedAt: null },
      topics: [],
    });
    const updateWithTopics = vi
      .fn()
      .mockResolvedValue({
        problem: { ...problem, status: 'solved', solvedAt },
        topics: [],
      });
    const repo = {
      findDetailed,
      updateWithTopics,
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    await service.update('u', problem.id, { status: 'solved' });
    expect(findDetailed).toHaveBeenCalled();
    const patch = updateWithTopics.mock.calls[0][2];
    expect(patch.status).toBe('solved');
    expect(patch.solvedAt).toBeInstanceOf(Date);
  });

  it('preserves solvedAt on idempotent solved patch', async () => {
    const solvedAt = new Date('2026-06-15T10:00:00.000Z');
    const findDetailed = vi.fn().mockResolvedValue({
      problem: { ...problem, status: 'solved', solvedAt },
      topics: [],
    });
    const updateWithTopics = vi.fn().mockResolvedValue({
      problem: { ...problem, status: 'solved', solvedAt },
      topics: [],
    });
    const repo = {
      findDetailed,
      updateWithTopics,
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    await service.update('u', problem.id, { status: 'solved' });
    const patch = updateWithTopics.mock.calls[0][2];
    expect(patch.solvedAt).toBe(solvedAt);
  });

  it('reverts problem to unsolved', async () => {
    const solvedAt = new Date('2026-06-15T10:00:00.000Z');
    const findDetailed = vi.fn().mockResolvedValue({
      problem: { ...problem, status: 'solved', solvedAt },
      topics: [],
    });
    const updateWithTopics = vi.fn().mockResolvedValue({
      problem: { ...problem, status: 'unsolved', solvedAt: null },
      topics: [],
    });
    const repo = {
      findDetailed,
      updateWithTopics,
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    await service.update('u', problem.id, { status: 'unsolved' });
    const patch = updateWithTopics.mock.calls[0][2];
    expect(patch.status).toBe('unsolved');
    expect(patch.solvedAt).toBeNull();
  });

  it('skips write for unsolved status no-op', async () => {
    const findDetailed = vi.fn().mockResolvedValue({
      problem: { ...problem, status: 'unsolved', solvedAt: null },
      topics: [],
    });
    const updateWithTopics = vi.fn();
    const repo = {
      findDetailed,
      updateWithTopics,
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    const result = await service.update('u', problem.id, { status: 'unsolved' });
    expect(updateWithTopics).not.toHaveBeenCalled();
    expect(result.status).toBe('unsolved');
    expect(result.solvedAt).toBeNull();
  });

  it('returns NOT_FOUND when delete misses', async () => {
    const repo = {
      delete: vi.fn().mockResolvedValue(false),
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    await expect(
      service.remove('u', '11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(HttpException);
    await expect(
      service.remove('u', '11111111-1111-4111-8111-111111111111'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'NOT_FOUND' }),
    });
  });
});