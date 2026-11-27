import { describe, expect, it } from 'vitest';
import { normalizeBlockPayload, sanitizeTextBody } from './learning-block-payload.js';

describe('sanitizeTextBody', () => {
  it('strips script tags and markup', () => {
    expect(sanitizeTextBody('<p>Hello</p><script>alert(1)</script>')).toBe('Hello');
  });
});

describe('normalizeBlockPayload', () => {
  it('normalizes text payload', () => {
    expect(normalizeBlockPayload('text', { body: '  hi  ' })).toEqual({ body: 'hi' });
  });
});