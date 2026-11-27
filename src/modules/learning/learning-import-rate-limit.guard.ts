import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/access.guard.js';
import { learningError } from './learning.errors.js';
import { LearningImportRateLimiter } from './learning-import-rate-limiter.js';

@Injectable()
export class LearningImportRateLimitGuard implements CanActivate {
  constructor(private readonly limiter: LearningImportRateLimiter) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    const retry = this.limiter.check(req.auth.user.id);
    if (!retry) return true;
    res.setHeader('Retry-After', String(retry));
    throw learningError(429, 'RATE_LIMITED', 'Too many import requests. Please try later.');
  }
}