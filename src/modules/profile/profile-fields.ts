import { z } from 'zod';
import { userNameSchema } from '../../common/schemas/user-name.schema.js';
import { measureCodePoints } from '../../common/unicode.js';

const trimmedNonempty = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) => {
        const len = measureCodePoints(value);
        return len >= min && len <= max;
      },
      `${label} must contain ${min}–${max} characters`,
    );

export const profileNameSchema = userNameSchema;

export const profileBioSchema = z
  .string()
  .refine((value) => measureCodePoints(value) <= 2000, {
    message: 'Bio must be at most 2000 characters',
  });

export const optionalTextFieldSchema = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

export const workOrganizationSchema = trimmedNonempty(1, 200, 'Organization');
export const workRoleSchema = trimmedNonempty(1, 200, 'Role');
export const educationInstitutionSchema = trimmedNonempty(1, 200, 'Institution');
export const educationProgramSchema = trimmedNonempty(1, 200, 'Program');

export const educationEndYearSchema = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length > 0 ? value : undefined))
  .refine((value) => value === undefined || measureCodePoints(value) <= 32, {
    message: 'End year must be at most 32 characters',
  })
  .optional();

export const workPeriodSchema = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length > 0 ? value : undefined))
  .refine((value) => value === undefined || measureCodePoints(value) <= 120, {
    message: 'Period must be at most 120 characters',
  })
  .optional();