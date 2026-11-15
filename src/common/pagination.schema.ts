import { z } from 'zod';

/** Shared pagination block for all paginated list JSON responses. */
export const paginationMetaSchema = z.strictObject({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
});

export function paginatedListSchema<T extends z.ZodType>(itemSchema: T) {
  return z.strictObject({
    items: z.array(itemSchema),
    meta: paginationMetaSchema,
  });
}