import { describe, expect, it } from 'vitest';
import {
  buildCompareSide,
  medianSides,
  type CompareSide,
} from './compare.js';

const emptyProgress = {
  overall: { total: 10, solved: 5, unsolved: 5 },
  topics: [
    {
      id: 'a0000000-0000-4000-8000-000000000001',
      name: 'Graphs',
      total: 5,
      solved: 2,
      unsolved: 3,
      percentComplete: 40,
    },
  ],
  platforms: [{ slug: 'leetcode' as const, name: 'LeetCode', total: 10, solved: 5, unsolved: 5 }],
};

const activity = {
  timezone: 'UTC' as const,
  streak: { currentDays: 2, lastSolveDate: '2026-01-01' },
  weeks: [
    { weekStart: '2026-01-06', added: 1, solved: 2 },
    { weekStart: '2026-01-13', added: 0, solved: 0 },
    { weekStart: '2026-01-20', added: 1, solved: 1 },
    { weekStart: '2026-01-27', added: 0, solved: 0 },
  ],
};

describe('compare', () => {
  it('buildCompareSide matches activity window', () => {
    const norm = new Map([
      ['a0000000-0000-4000-8000-000000000001', 'graphs'],
    ]);
    const side = buildCompareSide(emptyProgress, activity, norm);
    expect(side.activeWeeks).toBe(2);
    expect(side.windowWeeks).toBe(4);
    expect(side.solvesPerWeek).toBe(0.8);
    expect(side.topicShares[0]?.percent).toBe(50);
  });

  it('medianSides averages peer columns', () => {
    const a: CompareSide = {
      solved: 10,
      total: 20,
      unsolved: 10,
      solvesPerWeek: 2,
      activeWeeks: 8,
      windowWeeks: 12,
      streakDays: 3,
      platformShares: [{ slug: 'leetcode', percent: 80 }],
      topicShares: [],
    };
    const b: CompareSide = {
      ...a,
      solved: 20,
      activeWeeks: 12,
      platformShares: [{ slug: 'leetcode', percent: 40 }],
    };
    const med = medianSides([a, b]);
    expect(med.solved).toBe(15);
    expect(med.activeWeeks).toBe(10);
    expect(med.platformShares[0]?.percent).toBe(60);
  });
});