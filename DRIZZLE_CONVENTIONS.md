# Drizzle ORM conventions

Verified on **2026-11-10** against the npm `rc` releases and installed package declarations. This project deliberately uses the latest release candidate, as requested. Read this file before database changes.

## Version boundary

| Package / component | Selected version or API |
| --- | --- |
| `drizzle-orm` | **1.0.0-rc.5**, exact pin |
| `drizzle-kit` | **1.0.0-rc.5**, exact pin |
| Driver | Existing `pg`, through `drizzle-orm/node-postgres` |
| Database | PostgreSQL, locally managed by Docker Compose |
| Validation | Existing Zod 4; request/environment validation remains explicit |

Use the 1.0 RC documentation and installed declarations. Do not copy 0.x configuration, relation definitions, or migration metadata. Version pins preserve reproducibility; check release tags and upgrade ORM and Kit together deliberately.

| Use in this project | Do not reintroduce |
| --- | --- |
| `drizzle({ client: pool, relations })` | 0.x `{ client: pool, schema }` relational initialization |
| `defineRelations({ platforms })` from `drizzle-orm` | 0.x `relations(table, ({ one, many }) => ...)` |
| `NodePgDatabase<typeof relations>` | `NodePgDatabase<typeof schema>` |
| `db.query.platforms.findMany({ where: { slug: 'leetcode' } })` | 0.x callback-style relational filters |
| `defineConfig({ dialect: 'postgresql', ... })` | Old `driver: 'pg'` or the removed `strict` option |
| Timestamped folders with `migration.sql` and `snapshot.json` | Numbered SQL files and `meta/_journal.json` |
| `drizzle-kit generate`, `migrate`, `check`, `up` | Old `generate:pg`, `push:pg`, or `drop` commands |
| Array callback for table constraints/indexes | Deprecated object-returning extra-config callbacks |

SQL-like queries (`select().from().where(eq(...))`) remain supported. Distinguish them from the v2 relational `db.query` API rather than mixing their filter syntax.

## Schema folders and barrel exports

All database schema definitions belong in one root folder, with a separate folder per domain:

```text
src/database/
  database.module.ts
  database.service.ts
  schema/
    index.ts                     # public root barrel, used by runtime and Kit
    relations.ts                 # v2 relation registry using leaf table imports
    platforms/
      index.ts                   # domain barrel
      platforms.table.ts
    problems/                    # add when implemented
      index.ts
      problems.table.ts
      problems.relations.ts
    topics/                      # add when implemented
      index.ts
      topics.table.ts
      topics.relations.ts
    media/                       # user uploads — see MEDIA_CONVENTIONS.md
      index.ts
      media.table.ts
      media-resource-type.enum.ts
```

Profile and gallery behavior for `media.usage_count` and `users.avatar_media_id` is defined in [MEDIA_CONVENTIONS.md](./MEDIA_CONVENTIONS.md); do not encode slot rules only in application code without that document staying accurate.

Only `platforms/` is implemented initially. Future folders above illustrate organization, not an implemented problem-tracking schema.

1. Use named exports for every table, enum, and relation needed by Drizzle.
2. Each domain barrel re-exports its tables, relations, and relevant inferred types.
3. The root barrel re-exports each domain barrel. Export tables directly, not as nested objects such as `{ platforms: { table } }`.
4. Runtime imports `relations` from `./schema/index.js`. Kit's `schema` setting points to `./src/database/schema/index.ts`. Both consumers use this public entry point. `schema/relations.ts` uses `defineRelations({ platforms })` to register tables even when they do not yet have relation edges; add new tables to this registry as well as the barrels.
5. Within schema definitions, import referenced tables directly from their leaf files rather than from the root barrel. Keep relation definitions in separate files to reduce circular imports.
6. Keep schema modules declarative. They must not open connections, read configuration, run queries, or import Nest application modules.
7. Use `.js` suffixes on relative TypeScript imports for this NodeNext ESM project. Do not change them to extensionless imports to work around a tooling problem.

Example, already implemented:

```typescript
// platforms/platforms.table.ts
import { pgTable, text } from 'drizzle-orm/pg-core';

export const platforms = pgTable('platforms', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
});

export type Platform = typeof platforms.$inferSelect;
export type NewPlatform = typeof platforms.$inferInsert;
```

## Table and relation conventions

- Import PostgreSQL builders from `drizzle-orm/pg-core`, never SQLite or MySQL builders.
- Use plural snake_case SQL table names, snake_case SQL column names, and camelCase TypeScript properties. Specify SQL column names explicitly, as with `baseUrl: text('base_url')`.
- Define primary keys, required columns, unique constraints, checks, and foreign keys in the schema. Zod validation alone does not protect persistent data.
- For new numeric surrogate IDs, prefer `integer('id').primaryKey().generatedAlwaysAsIdentity()`. Choose UUIDs explicitly if the domain needs them; do not change the existing natural platform slug key.
- Use `timestamp('created_at', { withTimezone: true }).notNull().defaultNow()` for new audit timestamps. Choose Date/string modes deliberately and consistently.
- An `updatedAt` column does not update itself. Set it in writes, or deliberately implement a database trigger; runtime-only hooks are not database defaults.
- Return an array from the extra-config callback: `(table) => [uniqueIndex('...').on(table.column)]`.
- Many-to-many relationships require a join table and a composite key or unique constraint on the pair. Add indexes based on actual query directions.
- `defineRelations()` definitions describe query relationships; they do not create PostgreSQL foreign keys. Declare database references separately with `.references(...)` or `foreignKey(...)`.
- Export the central `relations` registry from the root barrel. Define edges with `defineRelations(tables, (r) => ({ ... }))`, using `r.one`/`r.many` and explicit `from`/`to` where needed. For domain-level composition, verify `defineRelationsPart` against the pinned API first. Use explicit aliases when multiple relationships connect the same tables.
- Infer record/insert types with `$inferSelect` and `$inferInsert`; avoid duplicating database shapes as handwritten interfaces. API inputs still need independently designed Zod schemas, especially for writable fields and ownership.

## Nest lifecycle and queries

`DatabaseService` owns one PostgreSQL pool per application instance, verifies connectivity, and exposes the typed Drizzle client as `databaseService.db`. Feature modules import `DatabaseModule` and inject `DatabaseService`. Do not create a pool per request or instantiate connections inside controllers/schema files.

```typescript
import { eq } from 'drizzle-orm';
import { platforms } from './database/schema/index.js';

const rows = await databaseService.db
  .select()
  .from(platforms)
  .where(eq(platforms.slug, 'leetcode'));
```

- Prefer Drizzle query builders and parameterized operators. Use tagged `sql` for expressions the builders cannot represent; never concatenate user input into SQL or pass it to `sql.raw`.
- Use the SQL-like query builder as the default. For relational queries, pass the `relations` registry at initialization and use v2 object filters. When a clause needs a callback (such as ordering or raw expressions), use its supplied aliased table, especially in nested queries.
- Use `.returning()` when the application needs affected rows. Handle an empty result for not-found cases.
- Give paginated queries deterministic ordering with a unique tie-breaker. Do not fetch the entire library to filter in application memory.
- Group related mutations with `db.transaction(async (tx) => { ... })` and use `tx` for every operation in that unit of work.
- Apply ownership filters in queries when accounts are implemented. Database types do not provide authorization.
- Let Nest close the shared pool through lifecycle hooks. Standalone scripts must close their own pools in `finally` blocks.

## Configuration and migrations

`drizzle.config.ts` uses `defineConfig`, `dialect: 'postgresql'`, the root schema barrel, and output folder `drizzle/`. It loads `.env` and validates `DATABASE_URL` with the same Zod field used by the backend. CLI tools require only the database URL, not HTTP configuration. Credentials never belong in this config file or generated SQL.

| Command | Purpose |
| --- | --- |
| `pnpm db:generate --name=add-problems` | Generate SQL and snapshots from schema changes on the host |
| `pnpm db:check` | Check generated migration snapshot consistency; does not validate a live database |
| `pnpm db:migrate` | Apply committed migrations using the host/external database URL |
| `pnpm db:migrate:docker` | Run the same migration command inside the already running backend |
| `pnpm db:migrate:create --name=data-backfill` | Create a custom SQL migration, for manually authored changes |
| `pnpm db:seed` / `pnpm db:seed:docker` | Run the explicit, repeatable Drizzle seed |

- The normal workflow is edit schema, generate, review SQL, check, apply migrations, and verify affected behavior.
- Generate migrations on the host. The `drizzle/` folder is mounted read-only in the running backend; container commands apply existing files.
- Commit each generated timestamped migration folder with its `migration.sql` and `snapshot.json`. There is no file-based `meta/_journal.json` in this format. Use `drizzle-kit up` to convert an existing older migration folder, preserving its SQL rather than regenerating history.
- Generation and migration checking do not require a live database; migration application and seeds do.
- Do not use `drizzle-kit push` as the project deployment workflow. Do not apply schema changes during application startup.
- Do not edit already applied migrations or delete their migration folders. Use new forward migrations, including corrective migrations for rollback. There is no automatic `db:migrate:down` script after switching to Drizzle.
- Drizzle tracks applied migrations in its own migration journal in PostgreSQL. The previous `node-pg-migrate` history is independent and must not be treated as Drizzle history.
- `drizzle-kit check` checks metadata; a successful check is not proof that SQL has executed or that database contents match the schema.

### Initial migration

The initial platform migration was regenerated directly from the current schema at the user's request. It contains Drizzle-generated table creation SQL without legacy adoption logic. The previous migration and snapshot were removed. Generation does not apply SQL or change database migration history.

## Seeds and verification

`scripts/seed.ts` uses the same schema barrel and the node-postgres adapter. The seed inserts catalog platform reference rows inside a transaction with `onConflictDoNothing`, preserving existing records, then runs the shared `backfillProblemPlatformSlugs` helper (`src/database/seed/backfill-problem-platform-slugs.ts`) so existing problems get `platform_slug` from URL. Repeatable; no demo users or sample problems. Do not mix automatic demo/user-data insertion into schema migrations. For catalog-only re-slugging without re-running platform seed, use `pnpm db:backfill:platform-slugs`.

Before merging database changes, build and type-check, run relevant tests, run `db:check`, and confirm a second `db:generate` reports no unexpected schema changes. Against PostgreSQL, test migration application on an empty database with the current schema. Apply migrations and seeds twice to check repeatability, and confirm data survives container recreation. SQL generation/type-checking alone cannot establish database integration correctness.

## Sources and future lookup

- [ORM release tags](https://www.npmjs.com/package/drizzle-orm?activeTab=versions) and [Kit release history](https://www.npmjs.com/package/drizzle-kit?activeTab=versions): verify npm dist-tags before upgrading.
- [PostgreSQL adapter](https://orm.drizzle.team/docs/get-started-postgresql): use the 1.0 RC documentation for these pins.
- [Schema organization](https://orm.drizzle.team/docs/sql-schema-declaration): export schema objects for tooling discovery.
- [Kit configuration](https://orm.drizzle.team/docs/drizzle-config-file), [generation](https://orm.drizzle.team/docs/drizzle-kit-generate), and [migration application](https://orm.drizzle.team/docs/drizzle-kit-migrate): verify command/output details against installed Kit help.
- [Upgrade to v1](https://orm.drizzle.team/docs/upgrade-v1) and [v2 relations](https://orm.drizzle.team/docs/relations): migration-format conversion and current relational APIs.
- Installed `node_modules/drizzle-orm/node-postgres/driver.d.ts`, `relations.d.ts`, and `pg-core/` declarations are the local API authority for these exact pins.
