import { describe, expect, it } from 'vitest';
import {
  assertViewable,
  toPersonHeader,
  toPublicProblemRow,
  toTopicBoardRow,
} from './visibility.js';
import type { DiscoverSubjectRow } from './discover-subject.repository.js';
import { DISCOVER_ERROR } from './discover.errors.js';

function subject(
  visibility: DiscoverSubjectRow['visibility'],
): DiscoverSubjectRow {
  return {
    userId: '11111111-1111-4111-8111-111111111111',
    visibility,
    practiceGoal: null,
    handle: 'demo',
    name: 'Demo',
    bio: '',
    avatarMediaId: null,
    createdAt: new Date('2026-01-15T00:00:00.000Z'),
  };
}

describe('visibility', () => {
  it('throws identical profile not found for private and unknown', () => {
    const fail = (fn: () => void) => {
      try {
        fn();
        return null;
      } catch (error) {
        return (error as { response: unknown }).response;
      }
    };
    const a = fail(() => assertViewable(subject('private'), 'summary'));
    const b = fail(() => assertViewable(undefined, 'summary'));
    expect(a).toEqual(b);
    expect(a).toMatchObject({ code: DISCOVER_ERROR.PROFILE_NOT_FOUND });
  });

  it('enforces topic level', () => {
    expect(assertViewable(subject('summary'), 'summary').visibility).toBe(
      'summary',
    );
    expect(() => assertViewable(subject('summary'), 'topics')).toThrow();
    expect(assertViewable(subject('topics'), 'topics').visibility).toBe('topics');
  });

  it('projects only allowed header keys', () => {
    const row = toPersonHeader({
      handle: 'h',
      name: 'N',
      bio: '',
      practiceGoal: null,
      overall: { total: 1, solved: 0, unsolved: 1 },
      streak: { currentDays: 0, lastSolveDate: null },
      platforms: [],
      practicingSince: 'Jan 2026',
      email: 'secret@test',
    } as never);
    expect(row).not.toHaveProperty('email');
    expect(Object.keys(row).sort()).toEqual(
      [
        'bio',
        'handle',
        'name',
        'overall',
        'platforms',
        'practiceGoal',
        'practicingSince',
        'streak',
      ].sort(),
    );
  });

  it('omits topic id when not public', () => {
    const row = toTopicBoardRow({
      name: 'DP',
      total: 5,
      solved: 3,
      unsolved: 2,
      percentComplete: 60,
      isPublic: false,
      id: '11111111-1111-4111-8111-111111111111',
    });
    expect(row).not.toHaveProperty('id');
  });

  it('strips forbidden public problem keys', () => {
    const row = toPublicProblemRow({
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      platformSlug: 'leetcode',
      platformProblemId: 'two-sum',
      difficulty: 'Easy',
      rating: null,
      ownerStatus: 'solved',
      inViewerLibrary: false,
      notes: 'hidden',
    } as never);
    expect(row).not.toHaveProperty('notes');
    expect(row).not.toHaveProperty('id');
  });
});