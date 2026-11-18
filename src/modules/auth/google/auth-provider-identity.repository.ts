import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service.js';
import {
  authProviderIdentities,
  type NewAuthProviderIdentity,
} from '../../../database/schema/index.js';
import type { AuthProvider } from './auth-providers.js';

@Injectable()
export class AuthProviderIdentityRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async findByProviderSubject(provider: AuthProvider, providerSubject: string) {
    return (
      await this.db
        .select()
        .from(authProviderIdentities)
        .where(
          and(
            eq(authProviderIdentities.provider, provider),
            eq(authProviderIdentities.providerSubject, providerSubject),
          ),
        )
        .limit(1)
    )[0];
  }

  async findByUserAndProvider(userId: string, provider: AuthProvider) {
    return (
      await this.db
        .select()
        .from(authProviderIdentities)
        .where(
          and(
            eq(authProviderIdentities.userId, userId),
            eq(authProviderIdentities.provider, provider),
          ),
        )
        .limit(1)
    )[0];
  }

  async listByUserId(userId: string) {
    return this.db
      .select()
      .from(authProviderIdentities)
      .where(eq(authProviderIdentities.userId, userId));
  }

  async create(values: NewAuthProviderIdentity) {
    return (
      await this.db.insert(authProviderIdentities).values(values).returning()
    )[0]!;
  }

  async upsertByProviderSubject(
    values: NewAuthProviderIdentity,
  ): Promise<typeof authProviderIdentities.$inferSelect> {
    const existing = await this.findByProviderSubject(
      values.provider as AuthProvider,
      values.providerSubject,
    );
    if (existing) {
      const now = new Date();
      return (
        await this.db
          .update(authProviderIdentities)
          .set({
            providerEmail: values.providerEmail,
            updatedAt: now,
          })
          .where(eq(authProviderIdentities.id, existing.id))
          .returning()
      )[0]!;
    }
    return this.create(values);
  }

  async deleteByUserAndProvider(userId: string, provider: AuthProvider) {
    await this.db
      .delete(authProviderIdentities)
      .where(
        and(
          eq(authProviderIdentities.userId, userId),
          eq(authProviderIdentities.provider, provider),
        ),
      );
  }
}