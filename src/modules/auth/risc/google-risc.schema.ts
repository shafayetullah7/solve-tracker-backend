import { z } from 'zod';

const riscEventSubjectSchema = z.object({
  subject_type: z.string().min(1),
  sub: z.string().min(1).optional(),
  iss: z.string().min(1).optional(),
});

const riscEventPayloadSchema = z.object({
  subject: riscEventSubjectSchema.optional(),
  reason: z.string().optional(),
});

export const googleRiscPayloadSchema = z.object({
  jti: z.string().trim().min(1),
  iat: z.number().int().positive(),
  iss: z.string().min(1),
  aud: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  events: z.record(z.string(), riscEventPayloadSchema),
});

export type GoogleRiscPayload = z.infer<typeof googleRiscPayloadSchema>;