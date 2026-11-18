import { describe, expect, it } from 'vitest';
import {
  bumpDiscoverVersion,
  discoverCacheGet,
  discoverCacheSet,
  getDiscoverVersion,
  resetDiscoverVersionForTests,
} from './discover-cache.js';

describe('discover-cache', () => {
  it('invalidates entries when version bumps', () => {
    resetDiscoverVersionForTests();
    discoverCacheSet('k', { x: 1 });
    expect(discoverCacheGet('k')).toEqual({ x: 1 });
    bumpDiscoverVersion();
    expect(discoverCacheGet('k')).toBeUndefined();
    expect(getDiscoverVersion()).toBe(1);
  });
});