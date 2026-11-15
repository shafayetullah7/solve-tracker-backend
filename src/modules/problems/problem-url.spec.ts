import { describe, expect, it } from 'vitest';
import { prepareProblemUrl, ProblemUrlError } from './problem-url.js';

describe('prepareProblemUrl', () => {
  it('trims, lowercases host/scheme, removes fragment, preserves path and query', () => {
    const { url, normalizedUrl } = prepareProblemUrl(
      '  HTTPS://Example.COM/Path/To?Q=1&Keep=TRUE#section  ',
    );
    expect(url).toBe('https://example.com/Path/To?Q=1&Keep=TRUE');
    expect(normalizedUrl).toBe('https://example.com/Path/To?Q=1&Keep=TRUE');
  });

  it('collapses differing host case for duplicate detection', () => {
    const a = prepareProblemUrl('https://leetcode.com/problems/two-sum/');
    const b = prepareProblemUrl('https://LeetCode.com/problems/two-sum/');
    expect(a.normalizedUrl).toBe(b.normalizedUrl);
  });

  it('accepts typical platform URLs', () => {
    expect(
      prepareProblemUrl(
        'https://codeforces.com/problemset/problem/1705/C',
      ).normalizedUrl,
    ).toBe('https://codeforces.com/problemset/problem/1705/C');
    expect(
      prepareProblemUrl('https://www.codechef.com/problems/START123').url,
    ).toMatch(/^https:\/\/www\.codechef\.com/);
  });

  it('rejects invalid and unsupported schemes', () => {
    expect(() => prepareProblemUrl('   ')).toThrow(ProblemUrlError);
    expect(() => prepareProblemUrl('not-a-url')).toThrow(ProblemUrlError);
    expect(() => prepareProblemUrl('javascript:alert(1)')).toThrow(
      ProblemUrlError,
    );
    expect(() => prepareProblemUrl('file:///etc/passwd')).toThrow(
      ProblemUrlError,
    );
  });

  it('omits default ports in normalized form', () => {
    expect(
      prepareProblemUrl('https://example.com:443/foo').normalizedUrl,
    ).toBe('https://example.com/foo');
    expect(prepareProblemUrl('http://example.com:80/foo').normalizedUrl).toBe(
      'http://example.com/foo',
    );
  });
});