import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { prepareLinkableProblemUrl } from './learning-problem-link.validation.js';

describe('prepareLinkableProblemUrl', () => {
  it('accepts a catalog judge URL', () => {
    const prepared = prepareLinkableProblemUrl('https://leetcode.com/problems/two-sum/');
    expect(prepared.normalizedUrl).toBe('https://leetcode.com/problems/two-sum/');
    expect(prepared.url).toBe('https://leetcode.com/problems/two-sum/');
  });

  it('maps invalid URL to PROBLEM_URL_INVALID', () => {
    try {
      prepareLinkableProblemUrl('not-a-url');
      expect.unreachable('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const response = (error as HttpException).getResponse() as { code: string };
      expect(response.code).toBe('PROBLEM_URL_INVALID');
    }
  });

  it('maps unsupported host to PROBLEM_PLATFORM_UNSUPPORTED', () => {
    try {
      prepareLinkableProblemUrl('https://example.com/problems/foo');
      expect.unreachable('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const response = (error as HttpException).getResponse() as { code: string };
      expect(response.code).toBe('PROBLEM_PLATFORM_UNSUPPORTED');
    }
  });
});