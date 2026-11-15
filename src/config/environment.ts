import { z } from 'zod';

const port = z
  .string()
  .regex(/^\d+$/, 'Must contain only digits')
  .transform(Number)
  .pipe(z.number().int().min(1).max(65535));
const postgresUrl = z
  .string()
  .url()
  .refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return (
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      url.hostname.length > 0 &&
      url.pathname.length > 1
    );
  }, 'Must be a PostgreSQL URL with a hostname and database name');

export const databaseEnvironmentSchema = z.object({
  DATABASE_URL: postgresUrl,
});
const positive = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(2147483647));
export const authEnvironmentSchema = z.object({
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  JWT_ACCESS_TTL_SECONDS: positive,
  AUTH_SESSION_TTL_SECONDS: positive,
  PASSWORD_RESET_TTL_SECONDS: positive,
  ARGON2_MEMORY_KIB: positive,
  ARGON2_TIME_COST: positive,
  ARGON2_PARALLELISM: positive,
  AUTH_COOKIE_SECURE: z.enum(['true', 'false']).transform((v) => v === 'true'),
  AUTH_ACCESS_COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/),
  AUTH_REFRESH_COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/),
  FRONTEND_ORIGIN: z.url().refine((v) => {
    const u = new URL(v);
    return (
      ['http:', 'https:'].includes(u.protocol) &&
      u.origin === v &&
      !u.username &&
      !u.password
    );
  }, 'Must be an exact HTTP(S) origin'),
  EMAIL_DELIVERY_MODE: z.enum(['mock', 'resend']),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z
    .string()
    .min(1)
    .refine(
      (v) =>
        !/[\r\n]/.test(v) &&
        z.email().safeParse(v.includes('<') ? v.match(/<([^<>]+)>$/)?.[1] : v)
          .success,
      'Must be an email or display name with email',
    )
    .optional(),
});
export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    HOST: z.union([z.ipv4(), z.ipv6(), z.hostname()]),
    PORT: port,
    DATABASE_URL: postgresUrl,
    // z.coerce.boolean() would incorrectly convert the string "false" to true.
    SWAGGER_ENABLED: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true'),
    // Compose-only settings are optional when running against an external DB.
    DOCKER_BIND_ADDRESS: z.union([z.ipv4(), z.ipv6()]).optional(),
    DOCKER_DATABASE_URL: postgresUrl.optional(),
    POSTGRES_USER: z.string().trim().min(1).optional(),
    POSTGRES_PASSWORD: z.string().min(1).optional(),
    POSTGRES_DB: z.string().trim().min(1).optional(),
    POSTGRES_PORT: port.optional(),
  })
  .extend(authEnvironmentSchema.shape)
  .superRefine((v, ctx) => {
    const fail = (key: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [key], message });
    if (v.JWT_ACCESS_TTL_SECONDS > 3600)
      fail(
        'JWT_ACCESS_TTL_SECONDS',
        'Access lifetime must not exceed one hour',
      );
    if (v.AUTH_SESSION_TTL_SECONDS > 2592000)
      fail(
        'AUTH_SESSION_TTL_SECONDS',
        'Session lifetime must not exceed 30 days',
      );
    if (v.PASSWORD_RESET_TTL_SECONDS > 3600)
      fail(
        'PASSWORD_RESET_TTL_SECONDS',
        'Reset lifetime must not exceed one hour',
      );
    if (v.JWT_ACCESS_SECRET === v.JWT_REFRESH_SECRET)
      fail('JWT_REFRESH_SECRET', 'Signing secrets must differ');
    if (v.JWT_ACCESS_TTL_SECONDS > v.AUTH_SESSION_TTL_SECONDS)
      fail('JWT_ACCESS_TTL_SECONDS', 'Cannot exceed session lifetime');
    if (v.ARGON2_MEMORY_KIB < 19456 || v.ARGON2_MEMORY_KIB > 262144)
      fail('ARGON2_MEMORY_KIB', 'Must be between 19456 and 262144 KiB');
    if (v.ARGON2_TIME_COST < 2 || v.ARGON2_TIME_COST > 10)
      fail('ARGON2_TIME_COST', 'Must be between 2 and 10');
    if (v.ARGON2_PARALLELISM > 4)
      fail('ARGON2_PARALLELISM', 'Must be between 1 and 4');
    if (v.AUTH_ACCESS_COOKIE_NAME === v.AUTH_REFRESH_COOKIE_NAME)
      fail('AUTH_REFRESH_COOKIE_NAME', 'Cookie names must differ');
    if (
      !v.AUTH_COOKIE_SECURE &&
      [v.AUTH_ACCESS_COOKIE_NAME, v.AUTH_REFRESH_COOKIE_NAME].some(
        (n) => n.startsWith('__Host-') || n.startsWith('__Secure-'),
      )
    )
      fail('AUTH_COOKIE_SECURE', 'Prefixed cookies require Secure');
    if (
      v.NODE_ENV === 'production' &&
      (!v.AUTH_COOKIE_SECURE ||
        v.AUTH_ACCESS_COOKIE_NAME !== '__Host-access' ||
        v.AUTH_REFRESH_COOKIE_NAME !== '__Host-refresh' ||
        !v.FRONTEND_ORIGIN.startsWith('https://'))
    )
      fail(
        'AUTH_COOKIE_SECURE',
        'Production requires HTTPS and secure host-only cookie names',
      );
    if (v.NODE_ENV === 'production' && v.EMAIL_DELIVERY_MODE !== 'resend')
      fail('EMAIL_DELIVERY_MODE', 'Mock email is prohibited in production');
    if (
      v.EMAIL_DELIVERY_MODE === 'resend' &&
      (!v.RESEND_API_KEY || !v.RESEND_FROM)
    )
      fail('RESEND_API_KEY', 'Resend mode requires key and sender');
  });

export type Environment = z.infer<typeof environmentSchema>;
