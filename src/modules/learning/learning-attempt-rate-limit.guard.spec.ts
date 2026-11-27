import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { LearningAttemptRateLimiter } from './learning-attempt-rate-limiter.js';
import { LearningAttemptRateLimitGuard } from './learning-attempt-rate-limit.guard.js';

const viewerId = '11111111-1111-4111-8111-111111111111';

function context(): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        auth: { user: { id: viewerId } },
      }),
      getResponse: () => ({
        setHeader: () => {},
      }),
    }),
  } as ExecutionContext;
}

describe('LearningAttemptRateLimitGuard', () => {
  const prev = process.env.LEARNING_RATE_LIMIT_ATTEMPT_START_PER_HOUR;

  beforeEach(() => {
    process.env.LEARNING_RATE_LIMIT_ATTEMPT_START_PER_HOUR = '1';
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.LEARNING_RATE_LIMIT_ATTEMPT_START_PER_HOUR;
    else process.env.LEARNING_RATE_LIMIT_ATTEMPT_START_PER_HOUR = prev;
  });

  it('allows first attempt start', () => {
    const guard = new LearningAttemptRateLimitGuard(new LearningAttemptRateLimiter());
    expect(guard.canActivate(context())).toBe(true);
  });

  it('returns 429 on second start in window', () => {
    const limiter = new LearningAttemptRateLimiter();
    const guard = new LearningAttemptRateLimitGuard(limiter);
    expect(limiter.check(viewerId)).toBe(0);
    try {
      guard.canActivate(context());
      throw new Error('expected throw');
    } catch (error) {
      const ex = error as {
        getStatus: () => number;
        getResponse: () => { code: string };
      };
      expect(ex.getStatus()).toBe(429);
      expect(ex.getResponse().code).toBe('RATE_LIMITED');
    }
  });
});