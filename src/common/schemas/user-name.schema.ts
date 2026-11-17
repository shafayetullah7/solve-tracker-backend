import { z } from 'zod';
import { measureCodePoints } from '../unicode.js';

/** Register, session, and profile share one name contract. */
export const userNameSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      const len = measureCodePoints(value);
      return len >= 1 && len <= 100;
    },
    'Name must contain 1–100 characters',
  );