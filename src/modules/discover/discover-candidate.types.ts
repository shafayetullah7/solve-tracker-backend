import type { PracticeVisibility } from '../../common/schemas/practice-discovery.schema.js';

export type TopicStats = {
  normalizedName: string;
  total: number;
  solved: number;
};

export type PlatformShare = {
  slug: string;
  total: number;
  solved: number;
};

/** Aggregated row for rail scoring and person cards. */
export type DiscoverPersonSnapshot = {
  userId: string;
  handle: string;
  name: string;
  avatarMediaId: string | null;
  visibility: PracticeVisibility;
  practiceGoal: string | null;
  total: number;
  solved: number;
  topicNames: string[];
  topicStats: TopicStats[];
  platforms: PlatformShare[];
  /** 12 weeks, oldest → newest; active = solved ≥ 1 that week */
  activeWeeks: boolean[];
  solvesThisWeek: number;
  streakDays: number;
  /** Distinct solve days (YYYY-MM-DD) for streak / overlap */
  solveDates: string[];
};