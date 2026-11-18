import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { authError } from '../auth/auth.errors.js';
import { DiscoverPublicReadLimiter } from './discover-public-read-limiter.js';

@Injectable()
export class DiscoverPublicRateLimitGuard implements CanActivate {
  constructor(private readonly limiter: DiscoverPublicReadLimiter) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'public, max-age=60');
    const clientKey = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const retry = this.limiter.check(clientKey);
    if (!retry) return true;
    res.setHeader('Retry-After', String(retry));
    throw authError(429, 'RATE_LIMITED', 'Too many attempts. Please try later.', {
      retryAfter: retry,
    });
  }
}