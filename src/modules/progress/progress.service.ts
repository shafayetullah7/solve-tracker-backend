import { Injectable } from '@nestjs/common';
import { computeSolveStreak } from './progress-activity-streak.js';
import {
  activityRangeSince,
  buildWeekRange,
  mergeActivityWeeks,
} from './progress-activity-weeks.js';
import { buildPlatformProgressFromSlugCounts } from './progress-platform-breakdown.js';
import { percentComplete } from './progress-percent.js';
import { ProgressRepository } from './progress.repository.js';
import type { ProgressActivityResponse } from './schemas/activity.schema.js';
import type {
  ProgressCounts,
  ProgressResponse,
  TopicProgress,
} from './schemas/progress.schema.js';

function toCounts(total: number, solved: number): ProgressCounts {
  const safeTotal = Math.max(0, total);
  const safeSolved = Math.min(Math.max(0, solved), safeTotal);
  return {
    total: safeTotal,
    solved: safeSolved,
    unsolved: safeTotal - safeSolved,
  };
}

@Injectable()
export class ProgressService {
  constructor(private readonly repo: ProgressRepository) {}

  async getSummaries(userId: string): Promise<ProgressResponse> {
    const [overallRaw, ownedTopics, topicAgg, platformSlugCounts] =
      await Promise.all([
      this.repo.loadOverallCounts(userId),
      this.repo.loadOwnedTopics(userId),
      this.repo.loadTopicAssociationCounts(userId),
      this.repo.loadPlatformSlugCounts(userId),
    ]);

    const byTopicId = new Map(
      topicAgg.map((row) => [row.topicId, { total: row.total, solved: row.solved }]),
    );

    const topics: TopicProgress[] = ownedTopics.map((topic) => {
      const agg = byTopicId.get(topic.id) ?? { total: 0, solved: 0 };
      const counts = toCounts(agg.total, agg.solved);
      return {
        id: topic.id,
        name: topic.name,
        ...counts,
        percentComplete: percentComplete(counts.solved, counts.total),
      };
    });

    return {
      overall: toCounts(overallRaw.total, overallRaw.solved),
      topics,
      platforms: buildPlatformProgressFromSlugCounts(platformSlugCounts),
    };
  }

  async getActivity(
    userId: string,
    weeks: number,
  ): Promise<ProgressActivityResponse> {
    const now = new Date();
    const since = activityRangeSince(weeks, now);
    const [added, solved, solveDates] = await Promise.all([
      this.repo.loadWeeklyAddedCounts(userId, since),
      this.repo.loadWeeklySolvedCounts(userId, since),
      this.repo.loadDistinctSolveDates(userId),
    ]);

    const weekStarts = buildWeekRange(weeks, now);
    return {
      weeks: mergeActivityWeeks(weekStarts, added, solved),
      streak: computeSolveStreak(solveDates, now),
      timezone: 'UTC',
    };
  }
}