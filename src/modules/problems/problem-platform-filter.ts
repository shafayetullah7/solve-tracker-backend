import { ilike, type SQLWrapper } from 'drizzle-orm';
import { problems } from '../../database/schema/index.js';
import {
  PLATFORM_SLUGS,
  type PlatformSlug,
} from '../../shared/platform-catalog.js';

export { PLATFORM_SLUGS, type PlatformSlug };

export function hostnameFromPlatformBaseUrl(baseUrl: string): string {
  return new URL(baseUrl).hostname.toLowerCase();
}

/** Match stored problem URLs whose host contains the platform hostname (case-insensitive). */
export function platformUrlMatchesColumn(
  urlColumn: SQLWrapper = problems.url,
  hostname: string,
) {
  return ilike(urlColumn, `%${hostname.toLowerCase()}%`);
}