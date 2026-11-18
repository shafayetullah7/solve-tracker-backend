import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment.js';
import { normalizeUserHandle } from '../../common/schemas/user-handle.schema.js';
import type { AuthenticatedRequest } from '../auth/access.guard.js';
import { profileNotFound } from './discover.errors.js';
import {
  getDiscoverMode,
  isFullDiscoverEnabled,
  isSharingEnabled,
} from './discover-mode.js';

@Injectable()
export class DiscoverModeGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const mode = getDiscoverMode(this.config);
    if (!isSharingEnabled(mode)) {
      throw profileNotFound();
    }
    if (isFullDiscoverEnabled(mode)) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const paramHandle = req.params?.handle;
    if (typeof paramHandle !== 'string' || !paramHandle.trim()) {
      throw profileNotFound();
    }
    const routeHandle = normalizeUserHandle(paramHandle);
    const viewerHandle = normalizeUserHandle(req.auth.user.handle);
    if (routeHandle !== viewerHandle) throw profileNotFound();
    return true;
  }
}