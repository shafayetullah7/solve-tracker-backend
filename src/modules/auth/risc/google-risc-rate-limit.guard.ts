import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { authError } from '../auth.errors.js';
import { GoogleRiscLimiter } from './google-risc-limiter.js';

@Injectable()
export class GoogleRiscRateLimitGuard implements CanActivate {
  constructor(private readonly limiter: GoogleRiscLimiter) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'private, no-store');
    const retry = this.limiter.checkReceive(req.ip ?? req.socket.remoteAddress);
    if (!retry) return true;
    res.setHeader('Retry-After', String(retry));
    throw authError(429, 'RATE_LIMITED', 'Too many attempts. Please try later.', {
      retryAfter: retry,
    });
  }
}