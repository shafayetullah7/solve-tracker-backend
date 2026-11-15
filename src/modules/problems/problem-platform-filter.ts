import { ilike, type SQLWrapper } from 'drizzle-orm';
import { problems } from '../../database/schema/index.js';

export const PLATFORM_SLUGS = ['codeforces', 'leetcode', 'codechef'] as const;
export type PlatformSlug = (typeof PLATFORM_SLUGS)[number];

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