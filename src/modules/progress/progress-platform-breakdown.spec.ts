import { describe, expect, it } from 'vitest';
import {
  aggregatePlatformProgress,
  buildPlatformProgress,
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