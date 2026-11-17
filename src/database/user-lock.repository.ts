import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from './database.service.js';
import { users } from './schema/index.js';
import type { User } from './schema/index.js';

export type DbClient = DatabaseService['db'];
export type DbTx = Parameters<Parameters<DbClient['transaction']>[0]>[0];

@Injectable()
export class UserLockRepository {
  constructor(private readonly database: DatabaseService) {}

  get db(): DbClient {
    return this.database.db;
  }

  /** Row-lock `users` and run work in one transaction. */
  async withLockedUser<T>(
    userId: string,
    operation: (tx: DbTx, user: User) => Promise<T>,
  ): Promise<T | null> {
    return this.db.transaction(async (tx) => {
      const user = (
        await tx.select().from(users).where(eq(users.id, userId)).for('update')
      )[0];
      return user ? operation(tx, user) : null;
    });
  }
}