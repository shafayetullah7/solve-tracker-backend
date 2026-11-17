import { z } from 'zod';
import type { MediaRecord } from '../../../database/schema/media/media.table.js';
import type { MediaResourceType } from '../../../database/schema/media/media-resource-type.enum.js';
import type { Media, MediaMetaByResourceType } from '../media-meta.types.js';

export const imageMediaMetaSchema = z.strictObject({
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const metaSchemaByResourceType = {
  image: imageMediaMetaSchema,
} as const satisfies Record<MediaResourceType, z.ZodType>;

export function parseMediaMeta<T extends MediaResourceType>(
  resourceType: T,
  meta: unknown,
): MediaMetaByResourceType[T] {
  return metaSchemaByResourceType[resourceType].parse(meta) as MediaMetaByResourceType[T];
}

export function parseMediaRecord(row: MediaRecord): Media {
  if (row.resourceType === 'image') {
    return {
      ...row,
      resourceType: 'image',
      meta: parseMediaMeta('image', row.meta),
    };
  }
  throw new Error(`Unsupported media resource type: ${row.resourceType as string}`);
}

export type NewImageMediaInput = {
  userId: string;
  publicId: string;
  extension: string;
  meta: unknown;
  usageCount?: number;
};

/** Type-safe insert shape for image uploads (validates `meta` before persist). */
export function newImageMediaInsert(input: NewImageMediaInput) {
  const meta = imageMediaMetaSchema.parse(input.meta);
  return {
    userId: input.userId,
    provider: 'cloudinary' as const,
    publicId: input.publicId,
    resourceType: 'image' as const,
    extension: input.extension,
    meta,
    usageCount: input.usageCount ?? 0,
  };
}