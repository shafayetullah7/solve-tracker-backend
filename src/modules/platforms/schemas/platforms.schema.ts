import { z } from 'zod';
import { PLATFORM_SLUGS } from '../../../shared/platform-catalog.js';

export const platformCatalogItemSchema = z.strictObject({
  slug: z.enum(PLATFORM_SLUGS),
  name: z.string(),
  baseUrl: z.url(),
  urlHosts: z.array(z.string()).min(1),
});

export const platformListResponseSchema = z
  .strictObject({
    items: z.array(platformCatalogItemSchema),
  })
  .meta({
    description:
      'Canonical judge / practice site reference list (slug, label, base URL, URL host patterns).',
  });

export const errorSchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type PlatformCatalogItem = z.infer<typeof platformCatalogItemSchema>;
export type PlatformListResponse = z.infer<typeof platformListResponseSchema>;