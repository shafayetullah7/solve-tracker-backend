import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment.js';
import { profileNotFound } from './discover.errors.js';
import { getDiscoverMode, isFullDiscoverEnabled } from './discover-mode.js';

@Injectable()
export class DiscoverFullModeGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  canActivate(_context: ExecutionContext): boolean {
    const mode = getDiscoverMode(this.config);
    if (!isFullDiscoverEnabled(mode)) throw profileNotFound();
    return true;
  }
}