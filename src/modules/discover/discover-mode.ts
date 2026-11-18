import type { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment.js';

export type DiscoverMode = Environment['DISCOVER_MODE'];

export function getDiscoverMode(
  config: ConfigService<Environment, true>,
): DiscoverMode {
  return config.getOrThrow('DISCOVER_MODE', { infer: true });
}

export function isSharingEnabled(mode: DiscoverMode): boolean {
  return mode === 'sharing' || mode === 'full';
}

export function isFullDiscoverEnabled(mode: DiscoverMode): boolean {
  return mode === 'full';
}