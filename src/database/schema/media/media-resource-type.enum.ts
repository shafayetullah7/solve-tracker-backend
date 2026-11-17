import { pgEnum } from 'drizzle-orm/pg-core';

export const MEDIA_RESOURCE_TYPES = ['image'] as const;
export type MediaResourceType = (typeof MEDIA_RESOURCE_TYPES)[number];

export const mediaResourceTypeEnum = pgEnum(
  'media_resource_type',
  [...MEDIA_RESOURCE_TYPES],
);