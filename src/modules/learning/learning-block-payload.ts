import { z } from 'zod';
import {
  learningBlockType,
  type LearningBlockType,
} from '../../database/schema/learning/learning-block-type.enum.js';

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

export const linkPayloadSchema = z.strictObject({
  url: z.string().max(2048).refine((value) => /^https?:\/\//i.test(value), 'URL must use http or https.'),
  label: z.string().max(500),
});

export const assessmentPayloadSchema = z.strictObject({
  assessmentId: z.uuid(),
  label: z.string().max(200).optional(),
});

export function stripMarkup(value: string): string {
  return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<[^>]+>/g, '');
}

export function sanitizeTextBody(body: string): string {
  return stripMarkup(body).trim();
}

export function normalizeBlockPayload(type: LearningBlockType, payload: unknown) {
  if (type === learningBlockType.Text) {
    const parsed = textPayloadSchema.parse(payload);
    return { body: sanitizeTextBody(parsed.body) };
  }
  if (type === learningBlockType.Code) {
    const parsed = codePayloadSchema.parse(payload);
    return { language: parsed.language?.trim() || undefined, body: parsed.body };
  }
  if (type === learningBlockType.Link) {
    const parsed = linkPayloadSchema.parse(payload);
    return { url: parsed.url.trim(), label: stripMarkup(parsed.label).trim() };
  }
  if (type === learningBlockType.Assessment) {
    const parsed = assessmentPayloadSchema.parse(payload);
    return { assessmentId: parsed.assessmentId, label: parsed.label?.trim() };
  }
  const parsed = checklistPayloadSchema.parse(payload);
  return {
    items: parsed.items.map((item) => ({
      id: item.id.trim(),
      label: stripMarkup(item.label).trim(),
    })),
  };
}