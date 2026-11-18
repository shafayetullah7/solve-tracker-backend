import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import {
  GOOGLE_RISC_RATE_LIMIT_GLOBAL,
  GOOGLE_RISC_RATE_LIMIT_PER_IP,
} from './google-risc.constants.js';
import { GoogleRiscLimiter } from './google-risc-limiter.js';
import { GoogleRiscRateLimitGuard } from './google-risc-rate-limit.guard.js';

function context(ip = '203.0.113.10'): ExecutionContext {
  const headers: Record<string, string> = {};
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        ip,
        socket: { remoteAddress: ip },
      }),
      getResponse: () => ({
        setHeader: (name: string, value: string) => {
          headers[name] = value;
        },
        getHeader: (name: string) => headers[name],
      }),
    }),
  } as ExecutionContext;
}

describe('GoogleRiscRateLimitGuard', () => {
  it('allows traffic under limits', () => {
    const guard = new GoogleRiscRateLimitGuard(new GoogleRiscLimiter());
    expect(guard.canActivate(context())).toBe(true);
  });

  it('blocks when per-ip limit exceeded', () => {
    const limiter = new GoogleRiscLimiter();
    const guard = new GoogleRiscRateLimitGuard(limiter);
    const ip = '198.51.100.7';
    for (let i = 0; i < GOOGLE_RISC_RATE_LIMIT_PER_IP; i++) {
      expect(limiter.checkReceive(ip)).toBe(0);
    }
    expect(() => guard.canActivate(context(ip))).toThrow(
      expect.objectContaining({
        getStatus: expect.any(Function),
      }),
    );
    try {
      guard.canActivate(context(ip));
    } catch (error) {
      expect((error as { getStatus: () => number }).getStatus()).toBe(429);
    }
  });

  it('blocks when global limit exceeded', () => {
    const limiter = new GoogleRiscLimiter();
    const guard = new GoogleRiscRateLimitGuard(limiter);
    for (let i = 0; i < GOOGLE_RISC_RATE_LIMIT_GLOBAL; i++) {
      expect(limiter.checkReceive(`10.0.0.${i % 250}`)).toBe(0);
    }
    expect(() => guard.canActivate(context('10.0.0.99'))).toThrow();
  });
});