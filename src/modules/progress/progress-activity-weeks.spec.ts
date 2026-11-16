import { describe, expect, it } from 'vitest';
import {
  buildWeekRange,
  mergeActivityWeeks,
  utcWeekStart,
} from './progress-activity-weeks.js';

describe('progress-activity-weeks', () => {
  it('buildWeekRange returns consecutive Mondays', () => {
    const now = new Date('2026-06-18T12:00:00.000Z'); // Wednesday
    const weeks = buildWeekRange(3, now);
    expect(weeks).toHaveLength(3);
    expect(weeks[0]).toBe('2026-06-01');
    expect(weeks[2]).toBe('2026-06-15');
    expect(utcWeekStart(now).toISOString().slice(0, 10)).toBe('2026-06-15');
  });

  it('mergeActivityWeeks zero-fills missing buckets', () => {
    const merged = mergeActivityWeeks(
      ['2026-06-02', '2026-06-09'],
      [{ weekStart: '2026-06-09', count: 2 }],
      [{ weekStart: '2026-06-02', count: 1 }],
    );
    expect(merged).toEqual([
      { weekStart: '2026-06-02', added: 0, solved: 1 },
      { weekStart: '2026-06-09', added: 2, solved: 0 },
    ]);
  });
});