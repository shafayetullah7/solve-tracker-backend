import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { databaseEnvironmentSchema } from './src/config/environment.js';

const result = databaseEnvironmentSchema.safeParse(process.env);
if (!result.success) {
  throw new Error(
    'DATABASE_URL must be a valid PostgreSQL URL with a database name.',
  );
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: result.data.DATABASE_URL },
});
