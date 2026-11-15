import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  users,
  authSessions,
  passwordResetTokens,
} from '../../database/schema/index.js';
import type { User } from '../../database/schema/index.js';
export type AuthDb = DatabaseService['db'];
export type AuthTx = Parameters<Parameters<AuthDb['transaction']>[0]>[0];
@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}
  get db() {
    return this.database.db;
  }
  async findUser(email: string) {
    return (
      await this.db.select().from(users).where(eq(users.email, email)).limit(1)
    )[0];
  }
  async createUser(values: typeof users.$inferInsert) {
    return (await this.db.insert(users).values(values).returning())[0]!;
  }
  async withUser<T>(
    id: string,
    operation: (tx: AuthTx, user: User) => Promise<T>,
  ): Promise<T | null> {
    return this.db.transaction(async (tx) => {
      const user = (
        await tx.select().from(users).where(eq(users.id, id)).for('update')
      )[0];
      return user ? operation(tx, user) : null;
    });
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
