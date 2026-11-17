import {
  PLATFORM_SLUGS,
  type PlatformSlug,
} from '../../shared/platform-catalog.js';

export { PLATFORM_SLUGS, type PlatformSlug };

/** Allowed `GET /problems?platform=` values (catalog + other). */
export const LIST_PLATFORM_FILTER_SLUGS = [
  ...PLATFORM_SLUGS,
  'other',
] as const;

export type ListPlatformFilterSlug =
  (typeof LIST_PLATFORM_FILTER_SLUGS)[number];