import { platformSlugFromUrl } from '../../shared/platform-catalog.js';

/** Persisted slug for problems.platform_slug (write path and backfill). */
export function storedPlatformSlugFromUrl(url: string): string {
  return platformSlugFromUrl(url) ?? 'other';
}