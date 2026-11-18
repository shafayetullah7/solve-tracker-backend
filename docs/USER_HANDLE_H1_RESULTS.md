# USER-HANDLE H1 — Schema, migration, shared validation (results)

**Status:** complete (2026-11-18).  
**Plan:** [USER_HANDLE_PHASED_PLAN.md](USER_HANDLE_PHASED_PLAN.md) § H1.  
**Policy:** [USER_HANDLE_A0_RESULTS.md](USER_HANDLE_A0_RESULTS.md).

## Database

| Change | Detail |
| --- | --- |
| Migration (nullable) | `drizzle/20261118102214_add-user-handle/migration.sql` — adds `handle`, `handle_changed_at`, partial unique index |
| Migration (backfill + NOT NULL) | `drizzle/20261118103421_backfill-user-handle-not-null/migration.sql` |
| Columns | `users.handle` (`text`, **NOT NULL**); `users.handle_changed_at` (`timestamptz`, **NULL**) |
| Backfill | `UPDATE` sets `u` + first 23 hex digits of `id` (no hyphens) before `SET NOT NULL` |
| Index | Migrated from partial to full unique on `lower(handle)` |

Backfill + constraint migration (verbatim core):

```sql
UPDATE "users" SET "handle" = 'u' || substr(replace("id"::text, '-', ''), 1, 23) WHERE "handle" IS NULL;
ALTER TABLE "users" ALTER COLUMN "handle" SET NOT NULL;
CREATE UNIQUE INDEX "users_handle_lower_uniq" ON "users" (lower("handle"));
```

Drizzle: [`users.table.ts`](../src/database/schema/users/users.table.ts) — `handle`, `handleChangedAt`, and `users_handle_lower_uniq` via `uniqueIndex`.

**Rollback (forward-only project):** corrective migration would `DROP INDEX users_handle_lower_uniq`; `ALTER TABLE users DROP COLUMN handle_changed_at, DROP COLUMN handle`.

## Shared validation

Module: [`src/common/schemas/user-handle.schema.ts`](../src/common/schemas/user-handle.schema.ts).

| Export | Purpose |
| --- | --- |
| `USER_HANDLE_RESERVED` / `USER_HANDLE_RESERVED_LIST` | 32 names locked to A0 alphabetical list |
| `USER_HANDLE_MIN` / `USER_HANDLE_MAX` | `3` / `24` code points |
| `normalizeUserHandle` | Trim; reject interior spaces; lowercase |
| `userHandleSchema` | Format, reserved, length, edges; output lowercase |
| `optionalUserHandleSchema` | Empty string → `undefined` for optional signup field (H2) |
| `profileHandleSchema` | Alias of `userHandleSchema` (H2 profile PATCH) |

Unit tests: [`user-handle.schema.spec.ts`](../src/common/schemas/user-handle.schema.spec.ts) (valid/invalid/reserved/case normalization; reserved contract snapshot).

| [`user-handle-assign.ts`](../src/common/schemas/user-handle-assign.ts) | `systemHandleFromUserId`, `generateRandomSystemHandle` (used by H2 API) |

**API wiring:** [USER_HANDLE_H2_RESULTS.md](USER_HANDLE_H2_RESULTS.md).

## Integration

| Script | npm script |
| --- | --- |
| [`scripts/test-user-handle-schema.mjs`](../scripts/test-user-handle-schema.mjs) | `pnpm test:user-handle:integration` |

Checks: migrate; insert `alpha_tester`; duplicate `Alpha_Tester` → Postgres `23505`; insert without handle → `NOT NULL` violation.

## Verification

| Command | Result |
| --- | --- |
| `pnpm db:check` | Pass |
| `pnpm build` | Pass |
| `pnpm test` | 198 tests pass (includes handle schema spec) |
| `TEST_DATABASE_URL=…/_test pnpm test:user-handle:integration` | 3 checks pass |
| `TEST_DATABASE_URL=…/_test pnpm test:auth:integration` | 39 assertions pass (nullable columns; existing flows omit handle) |

**Skipped (H1 boundary):** `pnpm api:check` — OpenAPI unchanged until H2.

**Regression note:** `test-auth-integration.mjs` expects **10** documented `/auth/*` paths (includes `POST /auth/google/risc` from GOOGLE-RISC).

## Next phase

**H2** — wire `optionalUserHandleSchema` / `profileHandleSchema` into auth and profile APIs; set `handle_changed_at`; map `23505` → `HANDLE_IN_USE`; session + OpenAPI. See [USER_HANDLE_PHASED_PLAN.md](USER_HANDLE_PHASED_PLAN.md) § H2.