import {
  AHEAD_MAX_MULTIPLIER,
  AHEAD_MIN_MULTIPLIER,
  AHEAD_RECENT_WEEKS,
  AHEAD_SMALL_LIBRARY_SOLVED_MAX,
  AHEAD_SMALL_LIBRARY_SOLVED_MIN,
  AHEAD_SMALL_LIBRARY_VIEWER_MAX,
  CONSISTENT_MIN_ACTIVE_WEEKS,
  CONSISTENT_SIZE_MAX_RATIO,
  CONSISTENT_SIZE_MIN_RATIO,
  PEER_WEIGHT_PLATFORM,
  PEER_WEIGHT_RECENT,
  PEER_WEIGHT_SIZE,
  PEER_WEIGHT_TOPIC,
  PLATFORM_SIM_THRESHOLD,
  RAIL_CARD_LIMIT,
  RECENT_ACTIVITY_OVERLAP_MIN,
  RECENT_ACTIVITY_OVERLAP_WEEKS,
} from './discover.config.js';
import type { DiscoverPersonSnapshot } from './discover-candidate.types.js';

export type DiscoverReasonKind =
  | 'shared_topics_platforms_cadence'
  | 'ahead_in_shared_topics'
  | 'same_goal'
  | 'consistent_cadence'
  | 'active_this_week'
  | 'following';

export type DiscoverReason = {
  kind: DiscoverReasonKind;
  sharedTopics?: string[];
  values: Record<string, string | number>;
};

export type ScoredPerson = {
  person: DiscoverPersonSnapshot;
  score: number;
  reason: DiscoverReason;
};

export type DiscoverRailKind =
  | 'peers'
  | 'ahead'
  | 'same_goal'
  | 'consistent'
  | 'active_week'
  | 'following';

function topicJaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const x of setA) {
    if (setB.has(x)) inter += 1;
  }
  const union = setA.size + setB.size - inter;
  if (union === 0) return 0;
  return inter / union;
}

function platformShares(person: DiscoverPersonSnapshot): Map<string, number> {
  const total = person.platforms.reduce((s, p) => s + p.total, 0);
  const shares = new Map<string, number>();
  if (total === 0) return shares;
  for (const p of person.platforms) {
    shares.set(p.slug, p.total / total);
  }
  return shares;
}

function platformSim(
  viewer: DiscoverPersonSnapshot,
  candidate: DiscoverPersonSnapshot,
): number {
  const a = platformShares(viewer);
  const b = platformShares(candidate);
  const keys = new Set([...a.keys(), ...b.keys()]);
  let l1 = 0;
  for (const key of keys) {
    l1 += Math.abs((a.get(key) ?? 0) - (b.get(key) ?? 0));
  }
  return 1 - 0.5 * l1;
}

function sizeSim(
  viewer: DiscoverPersonSnapshot,
  candidate: DiscoverPersonSnapshot,
): number {
  const a = Math.max(viewer.total, 1);
  const b = Math.max(candidate.total, 1);
  return Math.min(a, b) / Math.max(a, b);
}

function recentActivityOverlap(
  viewer: DiscoverPersonSnapshot,
  candidate: DiscoverPersonSnapshot,
): number {
  const weeks = Math.min(
    RECENT_ACTIVITY_OVERLAP_WEEKS,
    viewer.activeWeeks.length,
    candidate.activeWeeks.length,
  );
  const start = viewer.activeWeeks.length - weeks;
  let overlap = 0;
  for (let i = start; i < viewer.activeWeeks.length; i += 1) {
    if (viewer.activeWeeks[i] && candidate.activeWeeks[i]) overlap += 1;
  }
  return overlap >= RECENT_ACTIVITY_OVERLAP_MIN ? 1 : overlap / RECENT_ACTIVITY_OVERLAP_MIN;
}

function peerScore(
  viewer: DiscoverPersonSnapshot,
  candidate: DiscoverPersonSnapshot,
): number {
  const viewerTopics =
    viewer.visibility === 'topics' ? viewer.topicNames : [];
  const candidateTopics =
    candidate.visibility === 'topics' ? candidate.topicNames : [];
  const tj = topicJaccard(viewerTopics, candidateTopics);
  const ps = platformSim(viewer, candidate);
  const ss = sizeSim(viewer, candidate);
  const ra = recentActivityOverlap(viewer, candidate);
  return (
    PEER_WEIGHT_TOPIC * tj +
    PEER_WEIGHT_PLATFORM * ps +
    PEER_WEIGHT_SIZE * ss +
    PEER_WEIGHT_RECENT * ra
  );
}

function sharedTopicNames(
  viewer: DiscoverPersonSnapshot,
  candidate: DiscoverPersonSnapshot,
): string[] {
  if (viewer.visibility !== 'topics' || candidate.visibility !== 'topics') {
    return [];
  }
  const b = new Set(candidate.topicNames);
  return viewer.topicNames.filter((t) => b.has(t));
}

function solvedInTopics(
  person: DiscoverPersonSnapshot,
  names: string[],
): number {
  const set = new Set(names);
  return person.topicStats
    .filter((t) => set.has(t.normalizedName))
    .reduce((s, t) => s + t.solved, 0);
}

function activeInRecentWeeks(person: DiscoverPersonSnapshot, weeks: number): boolean {
  const slice = person.activeWeeks.slice(-weeks);
  return slice.some((w) => w);
}

function compareHandleAsc(
  a: DiscoverPersonSnapshot,
  b: DiscoverPersonSnapshot,
): number {
  return a.handle.localeCompare(b.handle);
}

function takeTop(
  scored: ScoredPerson[],
  limit = RAIL_CARD_LIMIT,
): ScoredPerson[] {
  return scored
    .sort((x, y) => {
      const d = y.score - x.score;
      if (d !== 0) return d;
      return compareHandleAsc(x.person, y.person);
    })
    .slice(0, limit);
}

function avgSolvesPerWeek(person: DiscoverPersonSnapshot): number {
  const active = person.activeWeeks.filter(Boolean).length;
  if (active === 0) return 0;
  const total = person.activeWeeks.length;
  const recent = person.activeWeeks.slice(-total);
  const solves = recent.reduce(
    (s, activeWeek, i) => s + (activeWeek ? 1 : 0),
    0,
  );
  return person.solved > 0 ? person.solved / Math.max(active, 1) : solves;
}

export function buildPeersRail(
  viewer: DiscoverPersonSnapshot,
  candidates: DiscoverPersonSnapshot[],
): ScoredPerson[] {
  const viewerTopics =
    viewer.visibility === 'topics' ? viewer.topicNames : [];
  const scored: ScoredPerson[] = [];

  for (const c of candidates) {
    const shared = sharedTopicNames(viewer, c);
    const ps = platformSim(viewer, c);
    if (shared.length === 0 && ps < PLATFORM_SIM_THRESHOLD) continue;

    const score = peerScore(viewer, c);
    const topPlatforms = c.platforms
      .sort((a, b) => b.total - a.total)
      .slice(0, 2)
      .map((p) => p.slug);
    scored.push({
      person: c,
      score,
      reason: {
        kind: 'shared_topics_platforms_cadence',
        sharedTopics: shared.slice(0, 3),
        values: {
          platforms: topPlatforms.join(', '),
          weekly: Math.round(avgSolvesPerWeek(c)),
        },
      },
    });
  }

  return takeTop(scored);
}

export function buildAheadRail(
  viewer: DiscoverPersonSnapshot,
  candidates: DiscoverPersonSnapshot[],
): ScoredPerson[] {
  const sharedBase = viewer.visibility === 'topics' ? viewer.topicNames : [];
  const viewerSharedSolved = solvedInTopics(viewer, sharedBase);
  const scored: ScoredPerson[] = [];

  for (const c of candidates) {
    if (c.visibility !== 'topics') continue;
    const shared = sharedTopicNames(viewer, c);
    if (shared.length === 0) continue;
    if (!activeInRecentWeeks(c, AHEAD_RECENT_WEEKS)) continue;

    const candSharedSolved = solvedInTopics(c, shared);
    let ok = false;
    if (viewer.total <= AHEAD_SMALL_LIBRARY_VIEWER_MAX) {
      ok =
        candSharedSolved >= AHEAD_SMALL_LIBRARY_SOLVED_MIN &&
        candSharedSolved <= AHEAD_SMALL_LIBRARY_SOLVED_MAX;
    } else if (viewerSharedSolved > 0) {
      const ratio = candSharedSolved / viewerSharedSolved;
      ok = ratio >= AHEAD_MIN_MULTIPLIER && ratio <= AHEAD_MAX_MULTIPLIER;
    }
    if (!ok) continue;

    const overlap = shared.length;
    const recency = c.solvesThisWeek;
    const score = overlap * 1000 + recency;
    scored.push({
      person: c,
      score,
      reason: {
        kind: 'ahead_in_shared_topics',
        sharedTopics: shared.slice(0, 3),
        values: { multiplier: Math.round(candSharedSolved / Math.max(viewerSharedSolved, 1)) },
      },
    });
  }

  return takeTop(scored);
}

export function buildSameGoalRail(
  viewer: DiscoverPersonSnapshot,
  candidates: DiscoverPersonSnapshot[],
): ScoredPerson[] {
  if (!viewer.practiceGoal) return [];
  const scored: ScoredPerson[] = [];
  for (const c of candidates) {
    if (c.practiceGoal !== viewer.practiceGoal) continue;
    const score = peerScore(viewer, c);
    const topPlatforms = c.platforms
      .sort((a, b) => b.total - a.total)
      .slice(0, 1)
      .map((p) => p.slug);
    scored.push({
      person: c,
      score,
      reason: {
        kind: 'same_goal',
        values: { goal: c.practiceGoal ?? '', platforms: topPlatforms.join(', ') },
      },
    });
  }
  return takeTop(scored);
}

export function buildConsistentRail(
  viewer: DiscoverPersonSnapshot,
  candidates: DiscoverPersonSnapshot[],
): ScoredPerson[] {
  const scored: ScoredPerson[] = [];
  for (const c of candidates) {
    const activeWeeks = c.activeWeeks.filter(Boolean).length;
    if (activeWeeks < CONSISTENT_MIN_ACTIVE_WEEKS) continue;
    const ratio = c.total / Math.max(viewer.total, 1);
    if (
      ratio < CONSISTENT_SIZE_MIN_RATIO ||
      ratio > CONSISTENT_SIZE_MAX_RATIO
    ) {
      continue;
    }
    const score = activeWeeks * 100 + peerScore(viewer, c);
    scored.push({
      person: c,
      score,
      reason: {
        kind: 'consistent_cadence',
        values: {
          activeWeeks,
          weekly: Math.round(avgSolvesPerWeek(c)),
        },
      },
    });
  }
  return takeTop(scored);
}

export function buildActiveWeekRail(
  viewer: DiscoverPersonSnapshot,
  candidates: DiscoverPersonSnapshot[],
): ScoredPerson[] {
  const scored: ScoredPerson[] = [];
  for (const c of candidates) {
    if (c.solvesThisWeek < 1) continue;
    const shared = sharedTopicNames(viewer, c);
    const score = shared.length * 100 + c.solvesThisWeek;
    scored.push({
      person: c,
      score,
      reason: {
        kind: 'active_this_week',
        sharedTopics: shared.slice(0, 2),
        values: { solvesThisWeek: c.solvesThisWeek },
      },
    });
  }
  return takeTop(scored);
}

export function buildSimilarPeople(
  subject: DiscoverPersonSnapshot,
  candidates: DiscoverPersonSnapshot[],
  limit: number,
): ScoredPerson[] {
  return takeTop(
    buildPeersRail(subject, candidates.filter((c) => c.userId !== subject.userId)),
    limit,
  );
}

export function buildRailByKind(
  kind: DiscoverRailKind,
  viewer: DiscoverPersonSnapshot,
  candidates: DiscoverPersonSnapshot[],
): ScoredPerson[] {
  switch (kind) {
    case 'peers':
      return buildPeersRail(viewer, candidates);
    case 'ahead':
      return buildAheadRail(viewer, candidates);
    case 'same_goal':
      return buildSameGoalRail(viewer, candidates);
    case 'consistent':
      return buildConsistentRail(viewer, candidates);
    case 'active_week':
      return buildActiveWeekRail(viewer, candidates);
    case 'following':
      return [];
    default:
      return [];
  }
}