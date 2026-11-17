import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/database/schema/index.js';
import { backfillProblemPlatformSlugs } from '../src/database/seed/backfill-problem-platform-slugs.js';
import { databaseEnvironmentSchema } from '../src/config/environment.js';
import { PLATFORM_SEED_ROWS } from '../src/shared/platform-catalog.js';

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
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.platforms)
      .values(PLATFORM_SEED_ROWS)
      .onConflictDoNothing({ target: schema.platforms.slug });
  });
  console.log('Platform seed complete. Existing records were preserved.');

  const column = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'problems'
       AND column_name = 'platform_slug'`,
  );
  if (column.rowCount === 0) {
    console.log(
      'Skipping problem platform_slug backfill (column missing — run pnpm db:migrate first).',
    );
  } else {
    const slugStats = await backfillProblemPlatformSlugs(db);
    console.log(
      `Problem platform_slug backfill complete. total=${slugStats.total} updated=${slugStats.updated} alreadyCorrect=${slugStats.unchanged}`,
    );
  }
} finally {
  await pool.end();
}