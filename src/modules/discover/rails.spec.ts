import { describe, expect, it } from 'vitest';
import type { DiscoverPersonSnapshot } from './discover-candidate.types.js';
import {
  buildActiveWeekRail,
  buildAheadRail,
  buildConsistentRail,
  buildPeersRail,
  buildSameGoalRail,
} from './rails.js';

function snap(
  partial: Partial<DiscoverPersonSnapshot> & { handle: string },
): DiscoverPersonSnapshot {
  return {
    userId: partial.handle,
    name: partial.handle,
    avatarMediaId: null,
    visibility: 'topics',
    practiceGoal: null,
    total: 20,
    solved: 10,
    topicNames: ['graphs', 'dp'],
    topicStats: [
      { normalizedName: 'graphs', total: 10, solved: 5 },
      { normalizedName: 'dp', total: 10, solved: 5 },
    ],
    platforms: [{ slug: 'leetcode', total: 15, solved: 8 }],
    activeWeeks: Array.from({ length: 12 }, () => true),
    solvesThisWeek: 2,
    streakDays: 3,
    solveDates: [],
    ...partial,
  };
}

describe('discover rails', () => {
  const viewer = snap({ handle: 'viewer', total: 20, solved: 10 });

  it('Peers: caps at 8 and tie-breaks by handle', () => {
    const candidates = Array.from({ length: 12 }, (_, i) =>
      snap({
        handle: `user-${String.fromCharCode(90 - i)}`,
        topicNames: ['graphs'],
      }),
    );
    const rail = buildPeersRail(viewer, candidates);
    expect(rail).toHaveLength(8);
    expect(rail[0]!.person.handle <= rail[1]!.person.handle).toBe(true);
  });

  it('Peers: summary candidate has topic Jaccard 0', () => {
    const summaryOnly = snap({
      handle: 'summary-only',
      visibility: 'summary',
      topicNames: [],
      topicStats: [],
      platforms: [{ slug: 'codeforces', total: 20, solved: 5 }],
    });
    const peers = buildPeersRail(viewer, [summaryOnly]);
    expect(peers).toHaveLength(0);
  });

  it('A step ahead: enforces multiplier band', () => {
    const ahead = snap({
      handle: 'ahead',
      topicStats: [
        { normalizedName: 'graphs', total: 20, solved: 30 },
        { normalizedName: 'dp', total: 10, solved: 10 },
      ],
    });
    const rail = buildAheadRail(viewer, [ahead]);
    expect(rail).toHaveLength(1);
    expect(rail[0]!.reason.kind).toBe('ahead_in_shared_topics');
  });

  it('Consistent: requires active week count and size band', () => {
    const consistent = snap({
      handle: 'steady',
      total: 25,
      activeWeeks: [...Array(11).fill(true), false],
    });
    const rail = buildConsistentRail(viewer, [consistent]);
    expect(rail).toHaveLength(1);
  });

  it('Active: orders by overlap before solves', () => {
    const a = snap({
      handle: 'a',
      solvesThisWeek: 10,
      topicNames: ['graphs'],
    });
    const b = snap({
      handle: 'b',
      solvesThisWeek: 20,
      topicNames: ['other'],
    });
    const rail = buildActiveWeekRail(viewer, [b, a]);
    expect(rail[0]!.person.handle).toBe('a');
  });

  it('Same goal: filters by practice goal', () => {
    const viewerGoal = snap({ handle: 'v', practiceGoal: 'interview' });
    const match = snap({ handle: 'match', practiceGoal: 'interview' });
    const miss = snap({ handle: 'miss', practiceGoal: 'contests' });
    const rail = buildSameGoalRail(viewerGoal, [match, miss]);
    expect(rail).toHaveLength(1);
    expect(rail[0]!.person.handle).toBe('match');
  });
});