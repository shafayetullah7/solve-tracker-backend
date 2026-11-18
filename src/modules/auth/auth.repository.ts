import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { UserLockRepository } from '../../database/user-lock.repository.js';
import type { DbTx } from '../../database/user-lock.repository.js';
import {
  users,
  authSessions,
  passwordResetTokens,
} from '../../database/schema/index.js';
import type { User } from '../../database/schema/index.js';
export type AuthDb = DatabaseService['db'];
export type AuthTx = DbTx;
@Injectable()
export class AuthRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly userLock: UserLockRepository,
  ) {}
  get db() {
    return this.database.db;
  }
  async findUser(email: string) {
    return (
      await this.db.select().from(users).where(eq(users.email, email)).limit(1)
    )[0];
  }
  async findUserById(id: string) {
    return (
      await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    )[0];
  }
  async createUser(values: typeof users.$inferInsert) {
    return (await this.db.insert(users).values(values).returning())[0]!;
  }
  async withUser<T>(
    id: string,
    operation: (tx: AuthTx, user: User) => Promise<T>,
  ): Promise<T | null> {
    return this.userLock.withLockedUser(id, operation);
  }
  async session(id: string, userId: string, db: AuthDb | AuthTx = this.db) {
    return (
      await db
        .select()
        .from(authSessions)
        .where(and(eq(authSessions.id, id), eq(authSessions.userId, userId)))
        .limit(1)
    )[0];
  }
  async activeUser(userId: string, sessionId: string) {
    return (
      await this.db
        .select({ user: users, session: authSessions })
        .from(authSessions)
        .innerJoin(users, eq(users.id, authSessions.userId))
        .where(
          and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId)),
        )
        .limit(1)
    )[0];
  }
  async resetToken(hash: string) {
    return (
      await this.db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.digest, hash))
        .limit(1)
    )[0];
  }
}
