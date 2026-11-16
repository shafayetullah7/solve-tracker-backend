import type { activityWeekBucketSchema } from './schemas/activity.schema.js';
import type { z } from 'zod';

export type ActivityWeekBucket = z.infer<typeof activityWeekBucketSchema>;

export type RawWeeklyCount = {
  weekStart: string;
  count: number;
};

/** Monday 00:00 UTC for the week containing `date`. */
export function utcWeekStart(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Oldest → newest, exactly `weekCount` buckets ending at the week containing `now`. */
export function buildWeekRange(weekCount: number, now: Date = new Date()): string[] {
  const end = utcWeekStart(now);
  const starts: string[] = [];
  for (let i = weekCount - 1; i >= 0; i -= 1) {
    starts.push(formatUtcDate(addUtcDays(end, -7 * i)));
  }
  return starts;
}

export function mergeActivityWeeks(
  weekStarts: string[],
  added: RawWeeklyCount[],
  solved: RawWeeklyCount[],
): ActivityWeekBucket[] {
  const addedMap = new Map(added.map((r) => [r.weekStart, r.count]));
  const solvedMap = new Map(solved.map((r) => [r.weekStart, r.count]));
  return weekStarts.map((weekStart) => ({
    weekStart,
    added: addedMap.get(weekStart) ?? 0,
    solved: solvedMap.get(weekStart) ?? 0,
  }));
}

export function activityRangeSince(weekCount: number, now: Date = new Date()): Date {
  const starts = buildWeekRange(weekCount, now);
  return new Date(`${starts[0]}T00:00:00.000Z`);
}