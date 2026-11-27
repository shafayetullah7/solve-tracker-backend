import { pgEnum } from 'drizzle-orm/pg-core';

/** Canonical media resource discriminant (PostgreSQL enum). */
export const mediaResourceType = {
  Image: 'image',
} as const;

export const MEDIA_RESOURCE_TYPES = [mediaResourceType.Image] as const;

export type MediaResourceType = (typeof MEDIA_RESOURCE_TYPES)[number];

export const mediaResourceTypeEnum = pgEnum(
  'media_resource_type',
  [...MEDIA_RESOURCE_TYPES],
);