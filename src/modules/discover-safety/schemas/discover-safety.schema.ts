import { z } from 'zod';
import { DISCOVER_REPORT_REASON_MAX } from '../../discover/discover.config.js';
import { errorSchema } from '../../topics/schemas/topics.schema.js';

export { errorSchema };

export const discoverReportBodySchema = z.strictObject({
  handle: z.string().min(1),
  reason: z.string().trim().min(1).max(DISCOVER_REPORT_REASON_MAX),
});

export type DiscoverReportBody = z.infer<typeof discoverReportBodySchema>;