import { eq, gt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { problems } from '../schema/problems/problems.table.js';
import type { relations } from '../schema/index.js';
import { platformSlugFromUrl } from '../../shared/platform-catalog.js';

const BATCH_SIZE = 500;

export type PlatformSlugBackfillStats = {
  total: number;
  updated: number;
  unchanged: number;
};

/** Idempotent: set platform_slug from problem url (catalog). Does not update updated_at. */
export async function backfillProblemPlatformSlugs(
  db: NodePgDatabase<typeof relations>,
): Promise<PlatformSlugBackfillStats> {
  let updated = 0;
  let unchanged = 0;
  let total = 0;
  let afterId: string | undefined;

  for (;;) {
    const rows = await db
      .select({
        id: problems.id,
        url: problems.url,
        platformSlug: problems.platformSlug,
      })
      .from(problems)
      .where(afterId ? gt(problems.id, afterId) : undefined)
      .orderBy(problems.id)
      .limit(BATCH_SIZE);

    if (rows.length === 0) break;

    for (const row of rows) {
      total++;
      const slug = platformSlugFromUrl(row.url) ?? 'other';
      if (row.platformSlug === slug) {
        unchanged++;
        continue;
      }
      await db
        .update(problems)
        .set({ platformSlug: slug })
        .where(eq(problems.id, row.id));
      updated++;
    }

    afterId = rows[rows.length - 1]!.id;
    if (rows.length < BATCH_SIZE) break;
  }

  return { total, updated, unchanged };
}