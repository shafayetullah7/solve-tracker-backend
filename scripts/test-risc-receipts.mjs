import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { authTestEnvironment } from '../test/auth-env.ts';

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test'))
  throw new Error(
    'Provide a dedicated TEST_DATABASE_URL ending in _test; no application DATABASE_URL fallback is allowed.',
  );
Object.assign(process.env, authTestEnvironment, {
  NODE_ENV: 'test',
  DATABASE_URL: target,
  PORT: '3000',
  HOST: '127.0.0.1',
  SWAGGER_ENABLED: 'true',
});
const pool = new pg.Pool({ connectionString: target });
const { AppModule } = await import('../dist/app.module.js');
const { RiscEventReceiptRepository } = await import(
  '../dist/modules/auth/risc/risc-event-receipt.repository.js'
);

let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  await module.init();
  const receipts = module.get(RiscEventReceiptRepository);
  const jti = randomUUID();

  check(!(await receipts.existsByJti(jti)), 'missing jti before insert');
  await receipts.create({
    jti,
    eventTypes: ['https://schemas.openid.net/secevent/risc/event-type/sessions-revoked'],
    providerSubject: `sub-${randomUUID()}`,
  });
  check(await receipts.existsByJti(jti), 'jti exists after insert');

  const purged = await receipts.deleteReceivedBefore(
    new Date(Date.now() + 60_000),
  );
  check(purged === 1, 'purge removes inserted receipt');

  console.log(`risc receipts integration: ${count} checks passed`);
} finally {
  await pool.end();
}