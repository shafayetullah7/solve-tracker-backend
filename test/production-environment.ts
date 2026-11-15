import { authTestEnvironment } from './auth-env.js';

/** Minimal valid `NODE_ENV=production` configuration for schema tests. */
export const productionEnvironmentFixture = {
  ...authTestEnvironment,
  NODE_ENV: 'production',
  HOST: '0.0.0.0',
  PORT: '3000',
  DATABASE_URL: 'postgresql://user:secret@db.example.com:5432/practice',
  SWAGGER_ENABLED: 'false',
  AUTH_COOKIE_SECURE: 'true',
  AUTH_ACCESS_COOKIE_NAME: '__Host-access',
  AUTH_REFRESH_COOKIE_NAME: '__Host-refresh',
  FRONTEND_ORIGIN: 'https://practice.example.com',
  EMAIL_DELIVERY_MODE: 'resend',
  RESEND_API_KEY: 're_production_test_key_not_real_32chars',
  RESEND_FROM: 'Practice <noreply@practice.example.com>',
} as const;