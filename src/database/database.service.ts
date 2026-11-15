import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import pg from 'pg';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { relations } from './schema/index.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool?: pg.Pool;
  private database?: NodePgDatabase<typeof relations>;

  constructor(private readonly config: ConfigService<Environment, true>) {}

  get db(): NodePgDatabase<typeof relations> {
    if (!this.database) throw new Error('Database has not been initialized.');
    return this.database;
  }

  get connection(): pg.Pool {
    if (!this.pool) throw new Error('Database has not been initialized.');
    return this.pool;
  }

  async onModuleInit(): Promise<void> {
    this.pool = new pg.Pool({
      connectionString: this.config.getOrThrow('DATABASE_URL', { infer: true }),
      connectionTimeoutMillis: 5000,
      max: 10,
    });
    this.pool.on('error', (error) => {
      this.logger.error(
        'Unexpected idle database connection error',
        error.stack,
      );
    });
    try {
      await this.pool.query('SELECT 1');
      this.database = drizzle({ client: this.pool, relations });
    } catch (error) {
      await this.pool.end();
      this.pool = undefined;
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
    this.database = undefined;
    this.pool = undefined;
  }
}
