import { z } from 'zod';

/** Express query: a single value or repeated keys → string array. */
export function uuidQueryArraySchema() {
  return z.preprocess(
    (value) => {
      if (value === undefined) return undefined;
      return Array.isArray(value) ? value : [value];
    },
    z.array(z.uuid()).optional(),
  );
}