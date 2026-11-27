import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { LearningImportRateLimiter } from './learning-import-rate-limiter.js';
import { LearningImportRateLimitGuard } from './learning-import-rate-limit.guard.js';

const viewerId = '11111111-1111-4111-8111-111111111111';

function context(): ExecutionContext {
  const headers: Record<string, string> = {};
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        auth: { user: { id: viewerId } },
      }),
      getResponse: () => ({
        setHeader: (name: string, value: string) => {
          headers[name] = value;
        },
      }),
    }),
  } as ExecutionContext;
}

describe('LearningImportRateLimitGuard', () => {
  const prev = process.env.LEARNING_RATE_LIMIT_IMPORT_PER_HOUR;

  beforeEach(() => {
    process.env.LEARNING_RATE_LIMIT_IMPORT_PER_HOUR = '2';
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.LEARNING_RATE_LIMIT_IMPORT_PER_HOUR;
    else process.env.LEARNING_RATE_LIMIT_IMPORT_PER_HOUR = prev;
  });

  it('allows under limit', () => {
    const guard = new LearningImportRateLimitGuard(new LearningImportRateLimiter());
    expect(guard.canActivate(context())).toBe(true);
  });

  it('returns 429 when exceeded', () => {
    const limiter = new LearningImportRateLimiter();
    const guard = new LearningImportRateLimitGuard(limiter);
    expect(limiter.check(viewerId)).toBe(0);
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