import { z } from 'zod';

export const mediaUploadResponseSchema = z.strictObject({
  id: z.uuid(),
  url: z.url(),
});

export const errorSchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type MediaUploadResponse = z.infer<typeof mediaUploadResponseSchema>;