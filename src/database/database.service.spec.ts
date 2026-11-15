import { DatabaseService } from './database.service.js';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment.js';
import { platforms } from './schema/index.js';

const { pool } = vi.hoisted(() => ({
  pool: { query: vi.fn(), end: vi.fn(), on: vi.fn() },
}));

vi.mock('pg', () => ({
  default: {
    Pool: class {
      constructor() {
        return pool;
      }
    },
  },
}));

describe('DatabaseService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://example:example@localhost/example',
    );
    pool.query.mockResolvedValue({ rows: [] });
    pool.end.mockResolvedValue(undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

  it('checks connectivity and releases the pool on shutdown', async () => {
    const service = new DatabaseService(
      new ConfigService<Environment, true>({
        DATABASE_URL: process.env.DATABASE_URL,
      }),
    );
    await service.onModuleInit();
    expect(pool.query).toHaveBeenCalledWith('SELECT 1');
    expect(service.connection).toBe(pool);
    const query = service.db.select().from(platforms).toSQL();
    expect(query.sql).toContain('"base_url"');
    expect(query.sql).toContain('from "platforms"');
    // The root barrel registers the table for the v2 relational query API.
    expect(service.db.query.platforms.findMany().toSQL().sql).toContain(
      '"platforms"',
    );
    await service.onModuleDestroy();
    expect(pool.end).toHaveBeenCalledOnce();
    expect(() => service.db).toThrow('not been initialized');
  });

  it('rejects missing database configuration', async () => {
    vi.stubEnv('DATABASE_URL', undefined);
    await expect(
      new DatabaseService(
        new ConfigService<Environment, true>(),
      ).onModuleInit(),
    ).rejects.toThrow('DATABASE_URL');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('releases the pool when startup connectivity fails', async () => {
    const error = new Error('Database unavailable');
    pool.query.mockRejectedValueOnce(error);
    const service = new DatabaseService(
      new ConfigService<Environment, true>({
        DATABASE_URL: process.env.DATABASE_URL,
      }),
    );
    await expect(service.onModuleInit()).rejects.toBe(error);
    expect(pool.end).toHaveBeenCalledOnce();
    expect(() => service.connection).toThrow('not been initialized');
  });
});
