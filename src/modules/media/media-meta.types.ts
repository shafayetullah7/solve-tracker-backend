import type { MediaResourceType } from '../../database/schema/media/media-resource-type.enum.js';

export type ImageMediaMeta = {
  bytes: number;
  width: number;
  height: number;
};

export type MediaMetaByResourceType = {
  image: ImageMediaMeta;
};

export type MediaMeta = MediaMetaByResourceType[MediaResourceType];

export type ImageMediaRecord = {
  id: string;
  userId: string;
  usageCount: number;
  provider: string;
  publicId: string;
  resourceType: 'image';
  extension: string;
  meta: ImageMediaMeta;
  createdAt: Date;
  updatedAt: Date;
};

/** Parsed `media` row — safe for application code after `parseMediaRecord`. */
export type Media = ImageMediaRecord;