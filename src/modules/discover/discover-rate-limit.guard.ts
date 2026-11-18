import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';
import { authError } from '../auth/auth.errors.js';
import type { AuthenticatedRequest } from '../auth/access.guard.js';
import { DiscoverProfileReadLimiter } from './discover-profile-read-limiter.js';

@Injectable()
export class DiscoverRateLimitGuard implements CanActivate {
  constructor(private readonly limiter: DiscoverProfileReadLimiter) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'private, no-store');
    const retry = this.limiter.check(req.auth.user.id);
    if (!retry) return true;
    res.setHeader('Retry-After', String(retry));
    throw authError(429, 'RATE_LIMITED', 'Too many attempts. Please try later.', {
      retryAfter: retry,
    });
  }
}