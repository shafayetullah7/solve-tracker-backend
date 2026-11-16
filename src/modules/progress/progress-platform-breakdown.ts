import {
  PLATFORM_CATALOG,
  platformLabelBySlug,
  platformSlugFromUrl,
  type PlatformSlug,
} from '../../shared/platform-catalog.js';
import type { ProgressCounts } from './schemas/progress.schema.js';

export type ProblemUrlStatus = {
  url: string;
  status: 'solved' | 'unsolved';
};

export type PlatformProgressBucket = PlatformSlug | 'other';

type BucketCounts = { total: number; solved: number };

function emptyBuckets(): Map<PlatformProgressBucket, BucketCounts> {
  const map = new Map<PlatformProgressBucket, BucketCounts>();
  for (const entry of PLATFORM_CATALOG) {
    map.set(entry.slug, { total: 0, solved: 0 });
  }
  map.set('other', { total: 0, solved: 0 });
  return map;
}

/** One problem URL contributes to exactly one platform bucket. */
export function aggregatePlatformProgress(
  rows: ProblemUrlStatus[],
): Map<PlatformProgressBucket, BucketCounts> {
  const map = emptyBuckets();
  for (const row of rows) {
    const slug = platformSlugFromUrl(row.url) ?? 'other';
    const bucket = map.get(slug)!;
    bucket.total += 1;
    if (row.status === 'solved') bucket.solved += 1;
  }
  return map;
}

function toCounts(total: number, solved: number): ProgressCounts {
  const safeTotal = Math.max(0, total);
  const safeSolved = Math.min(Math.max(0, solved), safeTotal);
  return {
    total: safeTotal,
    solved: safeSolved,
    unsolved: safeTotal - safeSolved,
  };
}

export type PlatformProgressRow = ProgressCounts & {
  slug: PlatformSlug | 'other';
  name: string;
};

export function toPlatformProgressArray(
  map: Map<PlatformProgressBucket, BucketCounts>,
): PlatformProgressRow[] {
  const rows: PlatformProgressRow[] = [];
  for (const entry of PLATFORM_CATALOG) {
    const agg = map.get(entry.slug);
    if (!agg || agg.total === 0) continue;
    rows.push({
      slug: entry.slug,
      name: platformLabelBySlug(entry.slug),
      ...toCounts(agg.total, agg.solved),
    });
  }
  const other = map.get('other');
  if (other && other.total > 0) {
    rows.push({
      slug: 'other',
      name: 'Other',
      ...toCounts(other.total, other.solved),
    });
  }
  return rows;
}

export function buildPlatformProgress(
  rows: ProblemUrlStatus[],
): PlatformProgressRow[] {
  return toPlatformProgressArray(aggregatePlatformProgress(rows));
}