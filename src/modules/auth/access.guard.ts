import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { AuthCookies } from './auth.cookies.js';
export type AuthIdentity = Awaited<ReturnType<AuthService['authenticate']>>;
export type AuthenticatedRequest = Request & { auth: AuthIdentity };
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookies,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    req.auth = await this.auth.authenticate(this.cookies.read(req, 'access'));
    return true;
  }
}
