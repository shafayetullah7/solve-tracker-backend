import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseCookie, stringifySetCookie } from 'cookie';
import type { Request, Response } from 'express';
import type { Environment } from '../../config/environment.js';
import type { Tokens } from './token.service.js';
@Injectable()
export class AuthCookies {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  read(req: Request, purpose: 'access' | 'refresh'): string | undefined {
    return parseCookie(req.headers.cookie ?? '')[this.name(purpose)];
  }
  private name(purpose: 'access' | 'refresh') {
    return this.config.getOrThrow(
      purpose === 'access'
        ? 'AUTH_ACCESS_COOKIE_NAME'
        : 'AUTH_REFRESH_COOKIE_NAME',
      { infer: true },
    );
  }
  private cookie(purpose: 'access' | 'refresh', value: string, expires: Date) {
    return stringifySetCookie({
      name: this.name(purpose),
      value,
      httpOnly: true,
      secure: this.config.getOrThrow('AUTH_COOKIE_SECURE', { infer: true }),
      sameSite: 'lax',
      path: '/',
      expires,
      maxAge: Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000)),
    });
  }
  set(res: Response, tokens: Tokens) {
    res.setHeader('Set-Cookie', [
      this.cookie('access', tokens.access, tokens.accessExpiresAt),
      this.cookie('refresh', tokens.refresh, tokens.expiresAt),
    ]);
  }
  clear(res: Response) {
    res.setHeader('Set-Cookie', [
      this.cookie('access', '', new Date(0)),
      this.cookie('refresh', '', new Date(0)),
    ]);
  }
}
