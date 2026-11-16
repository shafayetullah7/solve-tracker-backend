import { describe, expect, it } from 'vitest';
import { computeSolveStreak } from './progress-activity-streak.js';

describe('computeSolveStreak', () => {
  const now = new Date('2026-06-18T15:00:00.000Z');

  it('returns zero when last solve is too old', () => {
    expect(computeSolveStreak(['2026-06-10'], now)).toEqual({
      currentDays: 0,
      lastSolveDate: '2026-06-10',
    });
  });

  it('counts consecutive days ending today', () => {
    expect(
      computeSolveStreak(['2026-06-16', '2026-06-17', '2026-06-18'], now),
    ).toEqual({
      currentDays: 3,
      lastSolveDate: '2026-06-18',
    });
  });

  it('allows streak alive through yesterday only', () => {
    expect(computeSolveStreak(['2026-06-17'], now)).toEqual({
      currentDays: 1,
      lastSolveDate: '2026-06-17',
    });
  });
});