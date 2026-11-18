import { z } from 'zod';
import { userNameSchema } from '../../../common/schemas/user-name.schema.js';

export const PASSWORD_MIN_CODE_POINTS = 8;
export const PASSWORD_MAX_CODE_POINTS = 128;

const length = (min: number, max: number) => (value: string) =>
  Array.from(value).length >= min && Array.from(value).length <= max;

export const PASSWORD_LENGTH_MESSAGE = `Password must contain ${PASSWORD_MIN_CODE_POINTS}–${PASSWORD_MAX_CODE_POINTS} characters`;

export const passwordSchema = z
  .string()
  .refine(
    length(PASSWORD_MIN_CODE_POINTS, PASSWORD_MAX_CODE_POINTS),
    PASSWORD_LENGTH_MESSAGE,
  )
  .meta({
    description: `${PASSWORD_MIN_CODE_POINTS}–${PASSWORD_MAX_CODE_POINTS} Unicode code points; spaces are preserved.`,
  });
export const emailSchema = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const inputEmail = z.string().trim().pipe(emailSchema);
export const registerSchema = z.strictObject({
  name: userNameSchema,
  email: inputEmail,
  password: passwordSchema,
});
export const loginSchema = z.strictObject({
  email: inputEmail,
  password: z
    .string()
    .min(1)
    .refine(length(1, PASSWORD_MAX_CODE_POINTS), 'Password is too long'),
});
export const forgotSchema = z.strictObject({ email: inputEmail });
export const resetSchema = z.strictObject({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  password: passwordSchema,
});
export const changePasswordSchema = z.strictObject({
  currentPassword: z
    .string()
    .min(1)
    .refine(length(1, PASSWORD_MAX_CODE_POINTS), 'Password is too long'),
  newPassword: passwordSchema,
});
export const setPasswordSchema = z.strictObject({
  newPassword: passwordSchema,
});
export const accountFlagsSchema = z.strictObject({
  googleLinked: z.boolean(),
  hasPassword: z.boolean(),
});
export const userSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
});
export const userResponseSchema = z.strictObject({ user: userSchema });
export const sessionResponseSchema = z.strictObject({
  user: userSchema,
  account: accountFlagsSchema,
});
export const messageSchema = z.strictObject({ message: z.string() });
export const errorSchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
