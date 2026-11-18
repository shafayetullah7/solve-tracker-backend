import { Injectable } from '@nestjs/common';
import { eq, lt } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service.js';
import type { DbTx } from '../../../database/user-lock.repository.js';
import {
  riscEventReceipts,
  type NewRiscEventReceipt,
  type RiscEventReceipt,
} from '../../../database/schema/index.js';
import { isPostgresUniqueViolation } from './google-risc-event.js';

type RiscDb = DatabaseService['db'] | DbTx;

@Injectable()
export class RiscEventReceiptRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  private client(tx?: RiscDb): RiscDb {
    return tx ?? this.db;
  }

  async transaction<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
    return this.database.db.transaction(fn);
  }

  async existsByJti(jti: string, tx?: RiscDb): Promise<boolean> {
    const row = (
      await this.client(tx)
        .select({ jti: riscEventReceipts.jti })
        .from(riscEventReceipts)
        .where(eq(riscEventReceipts.jti, jti))
        .limit(1)
    )[0];
    return Boolean(row);
  }

  async create(
    values: NewRiscEventReceipt,
    tx?: RiscDb,
  ): Promise<RiscEventReceipt> {
    return (
      await this.client(tx).insert(riscEventReceipts).values(values).returning()
    )[0]!;
  }

  async createOrDuplicate(
    values: NewRiscEventReceipt,
    tx?: RiscDb,
  ): Promise<'created' | 'duplicate'> {
    try {
      await this.create(values, tx);
      return 'created';
    } catch (error) {
      if (isPostgresUniqueViolation(error)) return 'duplicate';
      throw error;
    }
  }

  async deleteReceivedBefore(cutoff: Date, tx?: RiscDb): Promise<number> {
    const removed = await this.client(tx)
      .delete(riscEventReceipts)
      .where(lt(riscEventReceipts.receivedAt, cutoff))
      .returning({ jti: riscEventReceipts.jti });
    return removed.length;
  }
}