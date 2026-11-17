import { describe, expect, test } from 'vitest';
import { profileBioSchema, profileNameSchema } from './profile-fields.js';

describe('profile-fields', () => {
  test('profileNameSchema trims and enforces length', () => {
    expect(profileNameSchema.parse('  Ada  ')).toBe('Ada');
    expect(profileNameSchema.safeParse('').success).toBe(false);
  });

  test('profileBioSchema allows empty and caps size', () => {
    expect(profileBioSchema.parse('')).toBe('');
    expect(profileBioSchema.safeParse('x'.repeat(2001)).success).toBe(false);
  });
});