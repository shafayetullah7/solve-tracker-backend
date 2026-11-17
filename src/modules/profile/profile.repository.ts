import { Injectable } from '@nestjs/common';
import { and, asc, count, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  userEducationEntries,
  userWorkEntries,
  users,
} from '../../database/schema/index.js';
import type { User } from '../../database/schema/index.js';
import type { UserEducationEntry } from '../../database/schema/profile/user-education-entries.table.js';
import type { UserWorkEntry } from '../../database/schema/profile/user-work-entries.table.js';
import type { DbTx } from '../../database/user-lock.repository.js';
import { MAX_EDUCATION_ENTRIES } from './profile.constants.js';

@Injectable()
export class ProfileRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async findUser(userId: string): Promise<User | undefined> {
    return (
      await this.db.select().from(users).where(eq(users.id, userId)).limit(1)
    )[0];
  }

  async listWork(
    userId: string,
    db: DbTx | DatabaseService['db'] = this.db,
  ): Promise<UserWorkEntry[]> {
    return db
      .select()
      .from(userWorkEntries)
      .where(eq(userWorkEntries.userId, userId))
      .orderBy(asc(userWorkEntries.sortOrder), asc(userWorkEntries.createdAt));
  }

  async listEducation(
    userId: string,
    db: DbTx | DatabaseService['db'] = this.db,
  ): Promise<UserEducationEntry[]> {
    return db
      .select()
      .from(userEducationEntries)
      .where(eq(userEducationEntries.userId, userId))
      .orderBy(
        asc(userEducationEntries.sortOrder),
        asc(userEducationEntries.createdAt),
      );
  }

  async workEntryCount(
    userId: string,
    db: DbTx | DatabaseService['db'] = this.db,
  ) {
    const [row] = await db
      .select({ total: count() })
      .from(userWorkEntries)
      .where(eq(userWorkEntries.userId, userId));
    return Number(row?.total ?? 0);
  }

  async educationEntryCount(
    userId: string,
    db: DbTx | DatabaseService['db'] = this.db,
  ) {
    const [row] = await db
      .select({ total: count() })
      .from(userEducationEntries)
      .where(eq(userEducationEntries.userId, userId));
    return Number(row?.total ?? 0);
  }

  async insertWork(
    userId: string,
    values: Pick<UserWorkEntry, 'organization' | 'role' | 'period'>,
    db: DbTx | DatabaseService['db'] = this.db,
  ): Promise<UserWorkEntry> {
    const now = new Date();
    const sortOrder = await this.workEntryCount(userId, db);
    return (
      await db
        .insert(userWorkEntries)
        .values({
          userId,
          organization: values.organization,
          role: values.role,
          period: values.period ?? null,
          sortOrder,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
    )[0]!;
  }

  async updateWork(
    userId: string,
    entryId: string,
    values: Pick<UserWorkEntry, 'organization' | 'role' | 'period'>,
    db: DbTx | DatabaseService['db'] = this.db,
  ): Promise<UserWorkEntry | undefined> {
    const rows = await db
      .update(userWorkEntries)
      .set({
        organization: values.organization,
        role: values.role,
        period: values.period ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(userWorkEntries.id, entryId), eq(userWorkEntries.userId, userId)),
      )
      .returning();
    return rows[0];
  }

  async deleteWork(
    userId: string,
    entryId: string,
    db: DbTx | DatabaseService['db'] = this.db,
  ): Promise<boolean> {
    const rows = await db
      .delete(userWorkEntries)
      .where(
        and(eq(userWorkEntries.id, entryId), eq(userWorkEntries.userId, userId)),
      )
      .returning({ id: userWorkEntries.id });
    return rows.length > 0;
  }

  async insertEducation(
    userId: string,
    values: Pick<UserEducationEntry, 'institution' | 'program' | 'endYear'>,
    db: DbTx | DatabaseService['db'] = this.db,
  ): Promise<UserEducationEntry> {
    const now = new Date();
    const sortOrder = await this.educationEntryCount(userId, db);
    return (
      await db
        .insert(userEducationEntries)
        .values({
          userId,
          institution: values.institution,
          program: values.program,
          endYear: values.endYear ?? null,
          sortOrder,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
    )[0]!;
  }

  async updateEducation(
    userId: string,
    entryId: string,
    values: Pick<UserEducationEntry, 'institution' | 'program' | 'endYear'>,
    db: DbTx | DatabaseService['db'] = this.db,
  ): Promise<UserEducationEntry | undefined> {
    const rows = await db
      .update(userEducationEntries)
      .set({
        institution: values.institution,
        program: values.program,
        endYear: values.endYear ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userEducationEntries.id, entryId),
          eq(userEducationEntries.userId, userId),
        ),
      )
      .returning();
    return rows[0];
  }

  async deleteEducation(
    userId: string,
    entryId: string,
    db: DbTx | DatabaseService['db'] = this.db,
  ): Promise<boolean> {
    const rows = await db
      .delete(userEducationEntries)
      .where(
        and(
          eq(userEducationEntries.id, entryId),
          eq(userEducationEntries.userId, userId),
        ),
      )
      .returning({ id: userEducationEntries.id });
    return rows.length > 0;
  }

  educationLimit(): number {
    return MAX_EDUCATION_ENTRIES;
  }

  /**
   * Locks the user row, enforces education cap, and inserts in one transaction.
   */
  async createEducationUnderCap(
    userId: string,
    values: Pick<UserEducationEntry, 'institution' | 'program' | 'endYear'>,
  ): Promise<UserEducationEntry | 'limit' | 'missing'> {
    return this.db.transaction(async (tx) => {
      const locked = (
        await tx.select().from(users).where(eq(users.id, userId)).for('update')
      )[0];
      if (!locked) return 'missing';
      const total = await this.educationEntryCount(userId, tx);
      if (total >= MAX_EDUCATION_ENTRIES) return 'limit';
      return this.insertEducation(userId, values, tx);
    });
  }
}