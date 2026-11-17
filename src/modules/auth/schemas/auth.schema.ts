import { z } from 'zod';
import { userNameSchema } from '../../../common/schemas/user-name.schema.js';

const length = (min: number, max: number) => (value: string) =>
  Array.from(value).length >= min && Array.from(value).length <= max;
export const passwordSchema = z
  .string()
  .refine(length(15, 128), 'Password must contain 15–128 characters')
  .meta({ description: '15–128 Unicode code points; spaces are preserved.' });
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
  password: z.string().min(1).refine(length(1, 128), 'Password is too long'),
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
    .refine(length(1, 128), 'Password is too long'),
  newPassword: passwordSchema,
});
export const userSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
});
export const userResponseSchema = z.strictObject({ user: userSchema });
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
