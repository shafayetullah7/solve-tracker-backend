import { describe, expect, it } from 'vitest';
import { hostnameFromPlatformBaseUrl } from './problem-platform-filter.js';

describe('hostnameFromPlatformBaseUrl', () => {
  it('parses seed platform URLs', () => {
    expect(hostnameFromPlatformBaseUrl('https://leetcode.com')).toBe('leetcode.com');
    expect(hostnameFromPlatformBaseUrl('https://codeforces.com')).toBe('codeforces.com');
    expect(hostnameFromPlatformBaseUrl('https://www.codechef.com')).toBe('www.codechef.com');
  });
});