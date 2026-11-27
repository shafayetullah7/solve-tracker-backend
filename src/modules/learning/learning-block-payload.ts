import { z } from 'zod';

const bodyLimit = 64_000;

export const textPayloadSchema = z.strictObject({
  body: z.string().max(bodyLimit),
});

export const codePayloadSchema = z.strictObject({
  language: z.string().max(64).optional(),
  body: z.string().max(bodyLimit),
});

export const checklistItemSchema = z.strictObject({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(500),
});

export const checklistPayloadSchema = z.strictObject({
  items: z.array(checklistItemSchema).min(1).max(100),
});

export function stripMarkup(value: string): string {
  return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<[^>]+>/g, '');
}

export function sanitizeTextBody(body: string): string {
  return stripMarkup(body).trim();
}

export function normalizeBlockPayload(type: 'text' | 'code' | 'checklist', payload: unknown) {
  if (type === 'text') {
    const parsed = textPayloadSchema.parse(payload);
    return { body: sanitizeTextBody(parsed.body) };
  }
  if (type === 'code') {
    const parsed = codePayloadSchema.parse(payload);
    return { language: parsed.language?.trim() || undefined, body: parsed.body };
  }
  const parsed = checklistPayloadSchema.parse(payload);
  return {
    items: parsed.items.map((item) => ({
      id: item.id.trim(),
      label: stripMarkup(item.label).trim(),
    })),
  };
}