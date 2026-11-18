import { environmentSchema } from './environment.js';

import { authTestEnvironment } from '../../test/auth-env.js';
import { productionEnvironmentFixture } from '../../test/production-environment.js';
const valid = {
  ...authTestEnvironment,
  NODE_ENV: 'development',
  HOST: '0.0.0.0',
  PORT: '3000',
  DATABASE_URL: 'postgresql://user:secret@localhost:5432/practice',
  SWAGGER_ENABLED: 'false',
};

describe('environment schema', () => {
  it('converts ports and boolean strings without requiring Docker settings', () => {
    const config = environmentSchema.parse({ ...valid, PATH: '/usr/bin' });
    expect(config.PORT).toBe(3000);
    expect(config.SWAGGER_ENABLED).toBe(false);
    expect(
      environmentSchema.parse({ ...valid, SWAGGER_ENABLED: 'true' })
        .SWAGGER_ENABLED,
    ).toBe(true);
  });

  it.each(['NODE_ENV', 'HOST', 'PORT', 'DATABASE_URL', 'SWAGGER_ENABLED'])(
    'requires %s without a fallback',
    (key) => {
      expect(
        environmentSchema.safeParse({ ...valid, [key]: undefined }).success,
      ).toBe(false);
    },
  );

  it.each(['', '0', '65536', '-1', '3.5', 'abc', ' 3000 ', '3e3'])(
    'rejects invalid port %j',
    (PORT) => {
      expect(environmentSchema.safeParse({ ...valid, PORT }).success).toBe(
        false,
      );
    },
  );

  it.each(['https://example.com/db', 'postgresql://localhost', 'not-a-url'])(
    'rejects invalid PostgreSQL URL %j',
    (DATABASE_URL) => {
      expect(
        environmentSchema.safeParse({ ...valid, DATABASE_URL }).success,
      ).toBe(false);
    },
  );

  it('validates Docker settings when supplied', () => {
    expect(
      environmentSchema.safeParse({ ...valid, POSTGRES_PORT: 'bad' }).success,
    ).toBe(false);
    expect(
      environmentSchema.safeParse({ ...valid, SWAGGER_ENABLED: 'yes' }).success,
    ).toBe(false);
  });
  it('requires independent secrets and secure production email/cookie configuration', () => {
    expect(
      environmentSchema.safeParse({
        ...valid,
        JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET,
      }).success,
    ).toBe(false);
    expect(
      environmentSchema.safeParse({ ...valid, ARGON2_MEMORY_KIB: '1024' })
        .success,
    ).toBe(false);
    expect(
      environmentSchema.safeParse({ ...valid, NODE_ENV: 'production' }).success,
    ).toBe(false);
    expect(
      environmentSchema.safeParse({ ...valid, EMAIL_DELIVERY_MODE: 'resend' })
        .success,
    ).toBe(false);
  });

  it('accepts a complete production configuration', () => {
    const config = environmentSchema.parse(productionEnvironmentFixture);
    expect(config.NODE_ENV).toBe('production');
    expect(config.SWAGGER_ENABLED).toBe(false);
    expect(config.EMAIL_DELIVERY_MODE).toBe('resend');
  });

  it('rejects Swagger enabled in production', () => {
    expect(
      environmentSchema.safeParse({
        ...productionEnvironmentFixture,
        SWAGGER_ENABLED: 'true',
      }).success,
    ).toBe(false);
  });

  it('parses with Google OAuth disabled and no Google secrets', () => {
    expect(environmentSchema.safeParse(valid).success).toBe(true);
  });

  it('requires Google credentials when OAuth is enabled', () => {
    expect(
      environmentSchema.safeParse({
        ...valid,
        GOOGLE_OAUTH_ENABLED: 'true',
      }).success,
    ).toBe(false);
  });

  it('accepts enabled Google OAuth with redirect and secrets', () => {
    const config = environmentSchema.parse({
      ...valid,
      GOOGLE_OAUTH_ENABLED: 'true',
      GOOGLE_OAUTH_CLIENT_ID: 'test.apps.googleusercontent.com',
      GOOGLE_OAUTH_CLIENT_SECRET: 'test-secret-min-length',
      GOOGLE_OAUTH_REDIRECT_URI:
        'http://localhost:3001/api/auth/google/callback',
    });
    expect(config.GOOGLE_OAUTH_ENABLED).toBe(true);
  });

  it('rejects non-HTTPS Google redirect in production when enabled', () => {
    expect(
      environmentSchema.safeParse({
        ...productionEnvironmentFixture,
        GOOGLE_OAUTH_ENABLED: 'true',
        GOOGLE_OAUTH_CLIENT_ID: 'prod.apps.googleusercontent.com',
        GOOGLE_OAUTH_CLIENT_SECRET: 'prod-secret-min-length',
        GOOGLE_OAUTH_REDIRECT_URI:
          'http://practice.example.com/api/auth/google/callback',
      }).success,
    ).toBe(false);
  });

  it('accepts HTTPS Google redirect in production when enabled', () => {
    expect(
      environmentSchema.safeParse({
        ...productionEnvironmentFixture,
        GOOGLE_OAUTH_ENABLED: 'true',
        GOOGLE_OAUTH_CLIENT_ID: 'prod.apps.googleusercontent.com',
        GOOGLE_OAUTH_CLIENT_SECRET: 'prod-secret-min-length',
        GOOGLE_OAUTH_REDIRECT_URI:
          'https://practice.example.com/api/auth/google/callback',
      }).success,
    ).toBe(true);
  });

  const googleOauthOn = {
    GOOGLE_OAUTH_ENABLED: 'true',
    GOOGLE_OAUTH_CLIENT_ID: 'test.apps.googleusercontent.com',
    GOOGLE_OAUTH_CLIENT_SECRET: 'test-secret-min-length',
    GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
  };

  it('parses with Google RISC disabled and no RISC overrides', () => {
    expect(environmentSchema.safeParse({ ...valid }).success).toBe(true);
  });

  it('rejects RISC enabled without OAuth enabled', () => {
    expect(
      environmentSchema.safeParse({
        ...valid,
        GOOGLE_RISC_ENABLED: 'true',
      }).success,
    ).toBe(false);
  });

  it('accepts RISC enabled when OAuth is fully configured', () => {
    const config = environmentSchema.parse({
      ...valid,
      ...googleOauthOn,
      GOOGLE_RISC_ENABLED: 'true',
    });
    expect(config.GOOGLE_RISC_ENABLED).toBe(true);
  });
});
