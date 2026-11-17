import { describe, expect, it } from 'vitest';
import { storedPlatformSlugFromUrl } from './problem-platform-slug.js';

describe('storedPlatformSlugFromUrl', () => {
  it('maps catalog host', () => {
    expect(storedPlatformSlugFromUrl('https://codeforces.com/problemset/problem/1/A')).toBe(
      'codeforces',
    );
  });

  it('maps unknown host to other', () => {
    expect(storedPlatformSlugFromUrl('https://example.com/p')).toBe('other');
  });
});