import { describe, expect, it } from 'vitest';
import {
  platformLabelFromUrl,
  platformSlugFromUrl,
} from './platform-catalog.js';

describe('platform-catalog', () => {
  it('maps common problem URLs to slugs', () => {
    expect(
      platformSlugFromUrl('https://atcoder.jp/contests/abc300/tasks/abc300_a'),
    ).toBe('atcoder');
    expect(
      platformSlugFromUrl('https://open.kattis.com/problems/hello'),
    ).toBe('kattis');
    expect(platformLabelFromUrl('https://cses.fi/problemset/list/')).toBe(
      'CSES',
    );
  });
});