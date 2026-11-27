import { describe, expect, it, vi } from 'vitest';
import { ProblemsLearningReadService } from './problems-learning-read.service.js';
import type { ProblemsRepository } from './problems.repository.js';

describe('ProblemsLearningReadService', () => {
  it('delegates batch lookup to the repository', async () => {
    const map = new Map([
      [
        'https://leetcode.com/problems/two-sum/',
        { problemId: '11111111-1111-4111-8111-111111111111', status: 'unsolved' as const },
      ],
    ]);
    const repo = {
      findStatusesByNormalizedUrls: vi.fn().mockResolvedValue(map),
    } satisfies Pick<ProblemsRepository, 'findStatusesByNormalizedUrls'>;
    const service = new ProblemsLearningReadService(repo as ProblemsRepository);
    const result = await service.findStatusesByNormalizedUrls('user-id', [
      'https://leetcode.com/problems/two-sum/',
    ]);
    expect(result.get('https://leetcode.com/problems/two-sum/')?.status).toBe('unsolved');
    expect(repo.findStatusesByNormalizedUrls).toHaveBeenCalledWith('user-id', [
      'https://leetcode.com/problems/two-sum/',
    ]);
  });
});