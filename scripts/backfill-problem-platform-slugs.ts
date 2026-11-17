import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/database/schema/index.js';
import { backfillProblemPlatformSlugs } from '../src/database/seed/backfill-problem-platform-slugs.js';
import { databaseEnvironmentSchema } from '../src/config/environment.js';

const result = databaseEnvironmentSchema.safeParse(process.env);
if (!result.success) {
  throw new Error(
    'DATABASE_URL must be a valid PostgreSQL URL with a database name.',
  );
}

const pool = new pg.Pool({
  connectionString: result.data.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
const db = drizzle({ client: pool, relations: schema.relations });

try {
  const stats = await backfillProblemPlatformSlugs(db);
  console.log(
    `Platform slug backfill complete. total=${stats.total} updated=${stats.updated} alreadyCorrect=${stats.unchanged}`,
  );
} finally {
  await pool.end();
}