import { describe, expect, it } from 'vitest';
import {
  aggregatePlatformProgress,
  buildPlatformProgress,
  buildPlatformProgressFromSlugCounts,
  toPlatformProgressArray,
} from './progress-platform-breakdown.js';

describe('progress-platform-breakdown', () => {
  it('buckets catalog URLs and unknown hosts into other', () => {
    const rows = [
      {
        url: 'https://atcoder.jp/contests/abc300/tasks/abc300_a',
        status: 'solved' as const,
      },
      {
        url: 'https://open.kattis.com/problems/hello',
        status: 'unsolved' as const,
      },
      { url: 'https://example.com/p/1', status: 'solved' as const },
    ];
    const map = aggregatePlatformProgress(rows);
    expect(map.get('atcoder')).toEqual({ total: 1, solved: 1 });
    expect(map.get('kattis')).toEqual({ total: 1, solved: 0 });
    expect(map.get('other')).toEqual({ total: 1, solved: 1 });
  });

  it('counts each problem once across buckets', () => {
    const rows = [
      {
        url: 'https://leetcode.com/problems/two-sum/',
        status: 'unsolved' as const,
      },
      {
        url: 'https://leetcode.com/problems/three-sum/',
        status: 'solved' as const,
      },
    ];
    const platforms = buildPlatformProgress(rows);
    expect(platforms).toHaveLength(1);
    expect(platforms[0]).toMatchObject({
      slug: 'leetcode',
      total: 2,
      solved: 1,
      unsolved: 1,
    });
  });

  it('builds from SQL slug aggregates', () => {
    const platforms = buildPlatformProgressFromSlugCounts([
      { platformSlug: 'leetcode', total: 3, solved: 2 },
      { platformSlug: 'other', total: 1, solved: 0 },
    ]);
    expect(platforms).toHaveLength(2);
    expect(platforms[0]).toMatchObject({
      slug: 'leetcode',
      total: 3,
      solved: 2,
      unsolved: 1,
    });
    expect(platforms[1]).toMatchObject({
      slug: 'other',
      name: 'Other',
      total: 1,
    });
  });

  it('folds unknown stored slug into other bucket', () => {
    const platforms = buildPlatformProgressFromSlugCounts([
      { platformSlug: 'not-a-real-slug', total: 2, solved: 1 },
    ]);
    expect(platforms).toHaveLength(1);
    expect(platforms[0]?.slug).toBe('other');
    expect(platforms[0]?.total).toBe(2);
  });

  it('omits empty catalog slugs and sorts other last', () => {
    const map = aggregatePlatformProgress([
      { url: 'https://codeforces.com/problemset/problem/1/A', status: 'solved' },
      { url: 'https://unknown.judge/x', status: 'unsolved' },
    ]);
    const list = toPlatformProgressArray(map);
    expect(list.map((r) => r.slug)).toEqual(['codeforces', 'other']);
    expect(list.at(-1)?.name).toBe('Other');
  });
});