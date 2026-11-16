import { describe, expect, it, vi } from 'vitest';
import { buildWeekRange } from './progress-activity-weeks.js';
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
      loadProblemUrlStatuses: vi.fn().mockResolvedValue([
        {
          url: 'https://leetcode.com/problems/two-sum/',
          status: 'solved',
        },
        {
          url: 'https://leetcode.com/problems/three-sum/',
          status: 'unsolved',
        },
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
    expect(result.platforms).toEqual([
      {
        slug: 'leetcode',
        name: 'LeetCode',
        total: 2,
        solved: 1,
        unsolved: 1,
      },
    ]);
  });

  it('builds activity weeks and streak', async () => {
    const now = new Date('2026-06-18T12:00:00.000Z');
    const [olderWeek] = buildWeekRange(2, now);
    const repo = {
      loadWeeklyAddedCounts: vi
        .fn()
        .mockResolvedValue([{ weekStart: olderWeek, count: 2 }]),
      loadWeeklySolvedCounts: vi
        .fn()
        .mockResolvedValue([{ weekStart: olderWeek, count: 1 }]),
      loadDistinctSolveDates: vi.fn().mockResolvedValue(['2026-06-18']),
    } as unknown as ProgressRepository;
    const service = new ProgressService(repo);
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const result = await service.getActivity('user', 2);
    vi.useRealTimers();
    expect(result.timezone).toBe('UTC');
    expect(result.weeks).toHaveLength(2);
    expect(result.weeks[0]).toMatchObject({
      weekStart: olderWeek,
      added: 2,
      solved: 1,
    });
    expect(result.streak.currentDays).toBeGreaterThanOrEqual(1);
  });
});