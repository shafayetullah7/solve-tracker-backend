import { and, eq } from 'drizzle-orm';
import { media } from '../../database/schema/index.js';
import type { MediaRecord } from '../../database/schema/media/media.table.js';
import type { DbTx } from '../../database/user-lock.repository.js';
import { mediaError } from './media.errors.js';

async function lockOwnedMedia(
  tx: DbTx,
  userId: string,
  mediaId: string,
): Promise<MediaRecord | undefined> {
  return (
    await tx
      .select()
      .from(media)
      .where(and(eq(media.id, mediaId), eq(media.userId, userId)))
      .for('update')
  )[0];
}

/** Profile slot −1. Safe when media is missing (no-op). */
export async function releaseProfileSlot(
  tx: DbTx,
  userId: string,
  mediaId: string,
): Promise<void> {
  const row = await lockOwnedMedia(tx, userId, mediaId);
  if (!row) return;
  const next = row.usageCount - 1;
  if (next < 0) {
    throw mediaError(
      409,
      'MEDIA_USAGE_INVALID',
      'Media usage count is inconsistent.',
    );
  }
  await tx
    .update(media)
    .set({ usageCount: next, updatedAt: new Date() })
    .where(eq(media.id, mediaId));
}

/** Profile slot +1 after ownership check and count invariant. */
export async function acquireProfileSlot(
  tx: DbTx,
  userId: string,
  mediaId: string,
): Promise<void> {
  const row = await lockOwnedMedia(tx, userId, mediaId);
  if (!row) {
    throw mediaError(404, 'NOT_FOUND', 'Media was not found.');
  }
  if (row.usageCount >= 2) {
    throw mediaError(
      409,
      'MEDIA_USAGE_FULL',
      'This media cannot accept another reference.',
    );
  }
  const next = row.usageCount + 1;
  if (next > 2) {
    throw mediaError(
      409,
      'MEDIA_USAGE_INVALID',
      'Media usage count is inconsistent.',
    );
  }
  await tx
    .update(media)
    .set({ usageCount: next, updatedAt: new Date() })
    .where(eq(media.id, mediaId));
}