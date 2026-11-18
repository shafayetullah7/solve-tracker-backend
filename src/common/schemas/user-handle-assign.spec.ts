import { describe, expect, it } from 'vitest';
import {
  generateRandomSystemHandle,
  systemHandleFromUserId,
} from './user-handle-assign.js';
import { userHandleSchema } from './user-handle.schema.js';

describe('user-handle-assign', () => {
  it('derives stable id-based handle', () => {
    const id = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    expect(systemHandleFromUserId(id)).toBe('ua1b2c3d4e5f64789a012345');
    expect(systemHandleFromUserId(id)).toHaveLength(24);
    expect(() => userHandleSchema.parse(systemHandleFromUserId(id))).not.toThrow();
  });

  it('random system handle passes validation', () => {
    const handle = generateRandomSystemHandle();
    expect(handle).toMatch(/^r[a-z0-9]{22}$/);
    expect(() => userHandleSchema.parse(handle)).not.toThrow();
  });
});