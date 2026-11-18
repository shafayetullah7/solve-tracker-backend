import { describe, expect, it } from 'vitest';
import { buildCompareInsights, type InsightContext } from './insights.js';
import type { CompareSide } from './compare.js';

const baseSide = (over: Partial<CompareSide>): CompareSide => ({
  solved: 5,
  total: 10,
  unsolved: 5,
  solvesPerWeek: 1,
  activeWeeks: 4,
  windowWeeks: 12,
  streakDays: 1,
  platformShares: [{ slug: 'leetcode', percent: 20 }],
  topicShares: [],
  ...over,
});

const ctx: InsightContext = {
  subjectHandle: 'demo',
  weeks: 12,
  subjectTopicsVisible: true,
  subjectPublicTopics: [
    { topicId: 't1', name: 'DP', normalizedName: 'dynamic programming' },
  ],
  viewerTopicNames: new Set(['graphs']),
};

describe('insights', () => {
  it('skips topic rules when subject is summary-only', () => {
    const me = baseSide({});
    const them = baseSide({
      activeWeeks: 12,
      topicShares: [{ normalizedName: 'dp', name: 'DP', percent: 50, percentComplete: 80 }],
    });
    const insights = buildCompareInsights(me, them, [], {
      ...ctx,
      subjectTopicsVisible: false,
      subjectPublicTopics: [],
    });
    expect(insights.every((i) => i.kind !== 'missing_topic')).toBe(true);
  });

  it('emits cadence gap when gap is large enough', () => {
    const insights = buildCompareInsights(
      baseSide({ activeWeeks: 4 }),
      baseSide({ activeWeeks: 12 }),
      [],
      ctx,
    );
    expect(insights.some((i) => i.kind === 'cadence_gap')).toBe(true);
  });
});