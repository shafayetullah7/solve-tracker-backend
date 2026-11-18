import { ConfigService } from '@nestjs/config';
import { environmentSchema } from '../../config/environment.js';
import { authTestEnvironment } from '../../../test/auth-env.js';
import { DiscoverModeGuard } from './discover-mode.guard.js';
import type { Environment } from '../../config/environment.js';
import { DISCOVER_ERROR } from './discover.errors.js';

function configFor(mode: 'off' | 'sharing' | 'full') {
  return new ConfigService<Environment, true>(
    environmentSchema.parse({
      ...authTestEnvironment,
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: '3000',
      DATABASE_URL: 'postgresql://user:secret@localhost:5432/practice_test',
      SWAGGER_ENABLED: 'false',
      DISCOVER_MODE: mode,
    }),
  );
}

function contextWithHandle(handle: string, viewerHandle: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        params: { handle },
        auth: { user: { handle: viewerHandle } },
      }),
    }),
  };
}

describe('DiscoverModeGuard', () => {
  it('blocks when mode is off', () => {
    const guard = new DiscoverModeGuard(configFor('off'));
    try {
      guard.canActivate(contextWithHandle('alice', 'alice') as never);
      expect.unreachable();
    } catch (error) {
      const ex = error as { getResponse: () => { code: string } };
      expect(ex.getResponse().code).toBe(DISCOVER_ERROR.PROFILE_NOT_FOUND);
    }
  });

  it('allows self in sharing mode', () => {
    const guard = new DiscoverModeGuard(configFor('sharing'));
    expect(
      guard.canActivate(contextWithHandle('alice', 'alice') as never),
    ).toBe(true);
  });

  it('blocks other in sharing mode', () => {
    const guard = new DiscoverModeGuard(configFor('sharing'));
    try {
      guard.canActivate(contextWithHandle('bob', 'alice') as never);
      expect.unreachable();
    } catch (error) {
      const ex = error as { getResponse: () => { code: string } };
      expect(ex.getResponse().code).toBe(DISCOVER_ERROR.PROFILE_NOT_FOUND);
    }
  });

  it('allows any handle in full mode', () => {
    const guard = new DiscoverModeGuard(configFor('full'));
    expect(
      guard.canActivate(contextWithHandle('bob', 'alice') as never),
    ).toBe(true);
  });
});