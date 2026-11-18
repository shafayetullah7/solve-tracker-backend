import type { ProgressActivityResponse } from '../progress/schemas/activity.schema.js';
import type { ProgressResponse } from '../progress/schemas/progress.schema.js';

export type ComparePlatformShare = {
  slug: string;
  percent: number;
};

export type CompareTopicShare = {
  normalizedName: string;
  name: string;
  percent: number;
  percentComplete: number;
};

export type CompareSide = {
  solved: number;
  total: number;
  unsolved: number;
  solvesPerWeek: number;
  activeWeeks: number;
  windowWeeks: number;
  streakDays: number;
  platformShares: ComparePlatformShare[];
  topicShares: CompareTopicShare[];
};

export type CompareTopicRow = {
  normalizedName: string;
  name: string;
  yourPercent: number;
  theirPercent: number;
  yourCompletion: number;
  theirCompletion: number;
};

function activeWeeksInWindow(
  weeks: ProgressActivityResponse['weeks'],
): number {
  return weeks.filter((w) => w.added > 0 || w.solved > 0).length;
}

function solvesInWindow(weeks: ProgressActivityResponse['weeks']): number {
  return weeks.reduce((s, w) => s + w.solved, 0);
}

export function buildPlatformShares(
  progress: ProgressResponse,
): ComparePlatformShare[] {
  const total = progress.overall.total;
  if (total === 0) return [];
  return progress.platforms.map((p) => ({
    slug: p.slug,
    percent: Math.round((p.total / total) * 100),
  }));
}

export function buildTopicShares(
  progress: ProgressResponse,
  normalizedByTopicId: Map<string, string>,
): CompareTopicShare[] {
  const total = progress.overall.total;
  if (total === 0) return [];
  return progress.topics
    .filter((t) => t.total > 0)
    .map((t) => ({
      normalizedName: normalizedByTopicId.get(t.id) ?? t.name.toLocaleLowerCase('en-US'),
      name: t.name,
      percent: Math.round((t.total / total) * 100),
      percentComplete: t.percentComplete,
    }))
    .sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name));
}

export function buildCompareSide(
  progress: ProgressResponse,
  activity: ProgressActivityResponse,
  normalizedByTopicId: Map<string, string>,
): CompareSide {
  const windowWeeks = activity.weeks.length;
  const activeWeeks = activeWeeksInWindow(activity.weeks);
  const solvedInWindow = solvesInWindow(activity.weeks);
  return {
    solved: progress.overall.solved,
    total: progress.overall.total,
    unsolved: progress.overall.unsolved,
    solvesPerWeek:
      windowWeeks > 0
        ? Math.round((solvedInWindow / windowWeeks) * 10) / 10
        : 0,
    activeWeeks,
    windowWeeks,
    streakDays: activity.streak.currentDays,
    platformShares: buildPlatformShares(progress),
    topicShares: buildTopicShares(progress, normalizedByTopicId),
  };
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function medianSides(sides: CompareSide[]): CompareSide {
  if (sides.length === 0) {
    return {
      solved: 0,
      total: 0,
      unsolved: 0,
      solvesPerWeek: 0,
      activeWeeks: 0,
      windowWeeks: 0,
      streakDays: 0,
      platformShares: [],
      topicShares: [],
    };
  }

  const slugSet = new Set<string>();
  const topicSet = new Set<string>();
  for (const s of sides) {
    for (const p of s.platformShares) slugSet.add(p.slug);
    for (const t of s.topicShares) topicSet.add(t.normalizedName);
  }

  const platformShares: ComparePlatformShare[] = [...slugSet].map((slug) => ({
    slug,
    percent: Math.round(
      median(
        sides
          .map((s) => s.platformShares.find((p) => p.slug === slug)?.percent ?? 0)
          .filter((_, i, arr) => arr.some((v) => v > 0) || true),
      ),
    ),
  }));

  const topicShares: CompareTopicShare[] = [...topicSet].map((normalizedName) => {
    const name =
      sides
        .flatMap((s) => s.topicShares)
        .find((t) => t.normalizedName === normalizedName)?.name ?? normalizedName;
    return {
      normalizedName,
      name,
      percent: Math.round(
        median(
          sides.map(
            (s) =>
              s.topicShares.find((t) => t.normalizedName === normalizedName)?.percent ??
              0,
          ),
        ),
      ),
      percentComplete: Math.round(
        median(
          sides.map(
            (s) =>
              s.topicShares.find((t) => t.normalizedName === normalizedName)
                ?.percentComplete ?? 0,
          ),
        ),
      ),
    };
  });

  return {
    solved: Math.round(median(sides.map((s) => s.solved))),
    total: Math.round(median(sides.map((s) => s.total))),
    unsolved: Math.round(median(sides.map((s) => s.unsolved))),
    solvesPerWeek: Math.round(median(sides.map((s) => s.solvesPerWeek)) * 10) / 10,
    activeWeeks: Math.round(median(sides.map((s) => s.activeWeeks))),
    windowWeeks: sides[0]!.windowWeeks,
    streakDays: Math.round(median(sides.map((s) => s.streakDays))),
    platformShares: platformShares.sort((a, b) => b.percent - a.percent),
    topicShares: topicShares.sort((a, b) => b.percent - a.percent),
  };
}

export function buildTopicCompareRows(
  yourSide: CompareSide,
  theirSide: CompareSide,
): CompareTopicRow[] {
  const keys = new Set<string>();
  for (const t of yourSide.topicShares) keys.add(t.normalizedName);
  for (const t of theirSide.topicShares) keys.add(t.normalizedName);
  return [...keys]
    .map((normalizedName) => {
      const y = yourSide.topicShares.find((t) => t.normalizedName === normalizedName);
      const th = theirSide.topicShares.find((t) => t.normalizedName === normalizedName);
      return {
        normalizedName,
        name: th?.name ?? y?.name ?? normalizedName,
        yourPercent: y?.percent ?? 0,
        theirPercent: th?.percent ?? 0,
        yourCompletion: y?.percentComplete ?? 0,
        theirCompletion: th?.percentComplete ?? 0,
      };
    })
    .sort(
      (a, b) =>
        Math.max(b.theirPercent, b.yourPercent) -
          Math.max(a.theirPercent, a.yourPercent) ||
        a.name.localeCompare(b.name),
    );
}