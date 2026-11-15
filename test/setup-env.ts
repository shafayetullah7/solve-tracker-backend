import { vi } from 'vitest';
import { authTestEnvironment } from './auth-env.js';
for (const [key, value] of Object.entries(authTestEnvironment))
  vi.stubEnv(key, value);
