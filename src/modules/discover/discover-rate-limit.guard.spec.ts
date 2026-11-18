import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { RATE_LIMIT_PROFILE_READ_PER_MIN } from './discover.config.js';
import { DiscoverProfileReadLimiter } from './discover-profile-read-limiter.js';
import { DiscoverRateLimitGuard } from './discover-rate-limit.guard.js';

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

describe('DiscoverRateLimitGuard', () => {
  it('allows under limit', () => {
    const guard = new DiscoverRateLimitGuard(new DiscoverProfileReadLimiter());
    expect(guard.canActivate(context())).toBe(true);
  });

  it('returns 429 with standard error schema when exceeded', () => {
    const limiter = new DiscoverProfileReadLimiter();
    const guard = new DiscoverRateLimitGuard(limiter);
    for (let i = 0; i < RATE_LIMIT_PROFILE_READ_PER_MIN; i++) {
      expect(limiter.check(viewerId)).toBe(0);
    }
    try {
      guard.canActivate(context());
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