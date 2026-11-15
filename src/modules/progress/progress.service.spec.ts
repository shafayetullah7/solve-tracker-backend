import { describe, expect, it, vi } from 'vitest';
import { ProgressService } from './progress.service.js';
import type { ProgressRepository } from './progress.repository.js';

describe('ProgressService', () => {
  it('merges topic rows with empty topics and computes percent', async () => {
    const topicId = '11111111-1111-4111-8111-111111111111';
    const emptyTopicId = '22222222-2222-4222-8222-222222222222';
    const repo = {
      loadOverallCounts: vi.fn().mockResolvedValue({ total: 2, solved: 1 }),
      loadOwnedTopics: vi.fn().mockResolvedValue([
        { id: topicId, name: 'Arrays' },
        { id: emptyTopicId, name: 'Empty' },
      ]),
      loadTopicAssociationCounts: vi.fn().mockResolvedValue([
        { topicId, total: 1, solved: 1 },
      ]),
    } as unknown as ProgressRepository;
    const service = new ProgressService(repo);
    const result = await service.getSummaries('user');
    expect(result.overall).toEqual({ total: 2, solved: 1, unsolved: 1 });
    expect(result.topics).toHaveLength(2);
    expect(result.topics[0]).toMatchObject({
      id: topicId,
      total: 1,
      solved: 1,
      unsolved: 0,
      percentComplete: 100,
    });
    expect(result.topics[1]).toMatchObject({
      id: emptyTopicId,
      total: 0,
      solved: 0,
      unsolved: 0,
      percentComplete: 0,
    });
  });
});