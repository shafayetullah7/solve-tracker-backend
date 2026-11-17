import { z } from 'zod';
import {
  educationEndYearSchema,
  educationInstitutionSchema,
  educationProgramSchema,
  profileBioSchema,
  profileNameSchema,
  workOrganizationSchema,
  workPeriodSchema,
  workRoleSchema,
} from '../profile-fields.js';

const uuidParam = z.uuid();

export const patchProfileSchema = z
  .strictObject({
    name: profileNameSchema.optional(),
    bio: profileBioSchema.optional(),
    avatarMediaId: z.uuid().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.name === undefined &&
      value.bio === undefined &&
      value.avatarMediaId === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one field is required.',
      });
    }
  });

export const workEntryResponseSchema = z.strictObject({
  id: z.uuid(),
  organization: z.string(),
  role: z.string(),
  period: z.string().optional(),
});

export const educationEntryResponseSchema = z.strictObject({
  id: z.uuid(),
  institution: z.string(),
  program: z.string(),
  endYear: z.string().optional(),
});

export const profileResponseSchema = z.strictObject({
  name: z.string(),
  bio: z.string(),
  avatarUrl: z.url().optional(),
  work: z.array(workEntryResponseSchema),
  education: z.array(educationEntryResponseSchema),
});

export const createWorkEntrySchema = z.strictObject({
  organization: workOrganizationSchema,
  role: workRoleSchema,
  period: workPeriodSchema,
});

export const updateWorkEntrySchema = z.strictObject({
  organization: workOrganizationSchema,
  role: workRoleSchema,
  period: workPeriodSchema,
});

export const createEducationEntrySchema = z.strictObject({
  institution: educationInstitutionSchema,
  program: educationProgramSchema,
  endYear: educationEndYearSchema,
});

export const updateEducationEntrySchema = z.strictObject({
  institution: educationInstitutionSchema,
  program: educationProgramSchema,
  endYear: educationEndYearSchema,
});

export const entryIdParamSchema = uuidParam;

export const errorSchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type PatchProfileInput = z.infer<typeof patchProfileSchema>;
export type CreateWorkEntryInput = z.infer<typeof createWorkEntrySchema>;
export type UpdateWorkEntryInput = z.infer<typeof updateWorkEntrySchema>;
export type CreateEducationEntryInput = z.infer<typeof createEducationEntrySchema>;
export type UpdateEducationEntryInput = z.infer<typeof updateEducationEntrySchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
export type WorkEntryResponse = z.infer<typeof workEntryResponseSchema>;
export type EducationEntryResponse = z.infer<typeof educationEntryResponseSchema>;