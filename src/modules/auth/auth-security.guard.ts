import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { httpResourcePath } from '../../common/http-resource-path.js';
import type { Environment } from '../../config/environment.js';
import { digest } from './token.service.js';
import { authError } from './auth.errors.js';
@Injectable()
export class AuthLimiter {
  private readonly entries = new Map<string, { count: number; end: number }>();
  check(
    key: string,
    limit: number,
    windowMs: number,
    increment = true,
  ): number {
    const now = Date.now();
    for (const [k, v] of this.entries) if (v.end <= now) this.entries.delete(k);
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= 10000) return 60;
      entry = { count: 0, end: now + windowMs };
      this.entries.set(key, entry);
    }
    if (increment) entry.count++;
    if (entry.count >= (increment ? limit + 1 : limit))
      return Math.max(1, Math.ceil((entry.end - now) / 1000));
    return 0;
  }
  emailKey(email: string) {
    return `login-email:${digest(email)}`;
  }
  failedLogin(email: string) {
    this.check(this.emailKey(email), 10, 900000);
  }
}
@Injectable()
export class AuthSecurityGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly limiter: AuthLimiter,
  ) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>(),
      res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const resourcePath = httpResourcePath(req);
    const oauthLimit =
      resourcePath === '/auth/google'
        ? this.limiter.check(
            `google-start:${req.ip ?? req.socket.remoteAddress}`,
            30,
            900_000,
          )
        : resourcePath === '/auth/google/callback'
          ? this.limiter.check(
              `google-callback:${req.ip ?? req.socket.remoteAddress}`,
              30,
              900_000,
            )
          : 0;
    if (oauthLimit) {
      res.setHeader('Retry-After', String(oauthLimit));
      throw authError(
        429,
        'RATE_LIMITED',
        'Too many attempts. Please try later.',
      );
    }
    if (req.method === 'GET') return true;
    if (
      req.headers.origin !==
        this.config.getOrThrow('FRONTEND_ORIGIN', { infer: true }) ||
      req.headers['x-requested-with'] !== 'practice'
    )
      throw authError(
        403,
        'CSRF_REJECTED',
        'Request origin or protection header is invalid.',
      );
    const allowsMultipart =
      resourcePath === '/media' && req.method === 'POST';
    if (
      req.headers['content-length'] !== '0' &&
      (req.headers['content-length'] || req.headers['transfer-encoding']) &&
      !req.is('application/json') &&
      !(allowsMultipart && req.is('multipart/form-data'))
    )
      throw authError(403, 'CSRF_REJECTED', 'JSON request body required.');
    const route =
      String(req.route?.path ?? req.path)
        .replace(/\/+$/, '')
        .split('/')
        .at(-1)
        ?.toLowerCase() ?? '';
    const mediaUploadRetry =
      resourcePath === '/media' && req.method === 'POST'
        ? this.limiter.check(
            `media-upload:${req.ip ?? req.socket.remoteAddress}`,
            30,
            3_600_000,
          )
        : 0;
    const limits: Record<string, [number, number]> = {
      register: [5, 3600000],
      login: [20, 900000],
      'forgot-password': [5, 900000],
      'reset-password': [10, 900000],
      'change-password': [10, 900000],
      refresh: [60, 60000],
    };
    const policy = limits[route];
    const retry = policy
      ? this.limiter.check(
          `${route}:${req.ip ?? req.socket.remoteAddress}`,
          policy[0],
          policy[1],
        )
      : 0;
    const email =
      req.body && typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    const emailRetry =
      route === 'login' && email
        ? this.limiter.check(this.limiter.emailKey(email), 10, 900000, false)
        : 0;
    if (retry || emailRetry || mediaUploadRetry) {
      res.setHeader(
        'Retry-After',
        String(retry || emailRetry || mediaUploadRetry),
      );
      throw authError(
        429,
        'RATE_LIMITED',
        'Too many attempts. Please try later.',
      );
    }
    return true;
  }
}
