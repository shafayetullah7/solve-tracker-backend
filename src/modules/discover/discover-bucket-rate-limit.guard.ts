import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';
import { authError } from '../auth/auth.errors.js';
import type { AuthenticatedRequest } from '../auth/access.guard.js';
import { DiscoverBucketLimiter } from './discover-bucket-limiter.js';

function assertRateLimit(
  limiter: DiscoverBucketLimiter,
  userId: string,
  bucket: 'search' | 'discover',
  res: Response,
): boolean {
  res.setHeader('Cache-Control', 'private, no-store');
  const retry = limiter.check(userId, bucket);
  if (!retry) return true;
  res.setHeader('Retry-After', String(retry));
  throw authError(429, 'RATE_LIMITED', 'Too many attempts. Please try later.', {
    retryAfter: retry,
  });
}

@Injectable()
export class DiscoverSearchRateLimitGuard implements CanActivate {
  constructor(private readonly limiter: DiscoverBucketLimiter) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    return assertRateLimit(this.limiter, req.auth.user.id, 'search', res);
  }
}

@Injectable()
export class DiscoverReadRateLimitGuard implements CanActivate {
  constructor(private readonly limiter: DiscoverBucketLimiter) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    return assertRateLimit(this.limiter, req.auth.user.id, 'discover', res);
  }
}