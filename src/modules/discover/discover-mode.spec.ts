import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment.js';
import { environmentSchema } from '../../config/environment.js';
import { authTestEnvironment } from '../../../test/auth-env.js';
import {
  getDiscoverMode,
  isFullDiscoverEnabled,
  isSharingEnabled,
} from './discover-mode.js';

function configFor(mode?: string) {
  return new ConfigService<Environment, true>(
    environmentSchema.parse({
      ...authTestEnvironment,
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: '3000',
      DATABASE_URL: 'postgresql://user:secret@localhost:5432/practice_test',
      SWAGGER_ENABLED: 'false',
      ...(mode !== undefined ? { DISCOVER_MODE: mode } : {}),
    }),
  );
}

describe('discover-mode', () => {
  it('defaults to off', () => {
    const mode = getDiscoverMode(configFor());
    expect(mode).toBe('off');
    expect(isSharingEnabled(mode)).toBe(false);
    expect(isFullDiscoverEnabled(mode)).toBe(false);
  });

  it('sharing enables owner settings path', () => {
    const mode = getDiscoverMode(configFor('sharing'));
    expect(isSharingEnabled(mode)).toBe(true);
    expect(isFullDiscoverEnabled(mode)).toBe(false);
  });

  it('full enables discovery reads', () => {
    const mode = getDiscoverMode(configFor('full'));
    expect(isSharingEnabled(mode)).toBe(true);
    expect(isFullDiscoverEnabled(mode)).toBe(true);
  });
});