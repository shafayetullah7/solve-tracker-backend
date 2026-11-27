import { describe, expect, it, vi } from 'vitest';
import { ProblemsService } from './problems.service.js';
import type { ProblemsRepository } from './problems.repository.js';

const userId = '22222222-2222-4222-8222-222222222222';
const problemId = '11111111-1111-4111-8111-111111111111';

describe('ProblemsService.listLearningReferences', () => {
  it('returns 404 when problem is not owned', async () => {
    const repo = {
      findDetailed: vi.fn().mockResolvedValue(undefined),
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    await expect(service.listLearningReferences(userId, problemId)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'NOT_FOUND' }),
    });
    expect(repo.findDetailed).toHaveBeenCalledWith(userId, problemId);
  });

  it('returns items from repository for owned problem', async () => {
    const items = [
      {
        guideId: '33333333-3333-4333-8333-333333333333',
        guideTitle: 'DSA',
        nodeId: '44444444-4444-4444-8444-444444444444',
        nodeTitle: 'Arrays',
      },
    ];
    const repo = {
      findDetailed: vi.fn().mockResolvedValue({
        problem: {
          id: problemId,
          normalizedUrl: 'https://leetcode.com/problems/two-sum/',
        },
        topics: [],
      }),
      listLearningReferencesForNormalizedUrl: vi.fn().mockResolvedValue(items),
    } as unknown as ProblemsRepository;
    const service = new ProblemsService(repo);
    const result = await service.listLearningReferences(userId, problemId);
    expect(result).toEqual({ items });
    expect(repo.listLearningReferencesForNormalizedUrl).toHaveBeenCalledWith(
      userId,
      'https://leetcode.com/problems/two-sum/',
    );
  });
});