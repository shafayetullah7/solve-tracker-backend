import { describe, expect, it } from 'vitest';
import {
  USER_HANDLE_RESERVED,
  USER_HANDLE_RESERVED_LIST,
  normalizeUserHandle,
  optionalUserHandleSchema,
  userHandleSchema,
} from './user-handle.schema.js';

describe('user-handle.schema', () => {
  it('reserved list matches A0 contract (32 entries)', () => {
    expect(USER_HANDLE_RESERVED_LIST).toHaveLength(32);
    expect([...USER_HANDLE_RESERVED].sort()).toEqual([
      ...USER_HANDLE_RESERVED_LIST,
    ]);
  });

  it('accepts valid handles and normalizes case', () => {
    expect(userHandleSchema.parse('tourist')).toBe('tourist');
    expect(userHandleSchema.parse('  Benq  ')).toBe('benq');
    expect(userHandleSchema.parse('shafayet_cp')).toBe('shafayet_cp');
    expect(normalizeUserHandle('Tourist')).toBe('tourist');
  });

  it('rejects invalid shapes', () => {
    expect(() => userHandleSchema.parse('ab')).toThrow();
    expect(() => userHandleSchema.parse('a'.repeat(25))).toThrow();
    expect(() => userHandleSchema.parse('_ab')).toThrow();
    expect(() => userHandleSchema.parse('ab_')).toThrow();
    expect(() => userHandleSchema.parse('has space')).toThrow();
    expect(() => userHandleSchema.parse('bad-hyphen')).toThrow();
  });

  it.each([...USER_HANDLE_RESERVED_LIST])('rejects reserved: %s', (handle) => {
    expect(() => userHandleSchema.parse(handle)).toThrow(/reserved/i);
  });

  it('optional schema allows absent and empty', () => {
    expect(optionalUserHandleSchema.parse(undefined)).toBeUndefined();
    expect(optionalUserHandleSchema.parse('')).toBeUndefined();
    expect(optionalUserHandleSchema.parse('valid_handle')).toBe('valid_handle');
  });
});