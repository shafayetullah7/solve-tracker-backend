# Phase 8 — Database and persistence (Step 8.6)

Operator notes for migrate, seed, and restart survival (MVP acceptance criterion 11).

## Fresh database

```bash
cd solve-tracker-backend
# Point DATABASE_URL or TEST_DATABASE_URL at the target database
pnpm db:migrate
pnpm db:seed          # optional dev fixtures; production uses explicit seeds (Phase 9)
```

## Repeat migrate (idempotent)

```bash
cd solve-tracker-backend
pnpm db:migrate       # second run should apply no pending migrations
pnpm db:check         # Drizzle schema drift check (included in verify:phase-8)
```

## Restart survival (automated)

Simulates a backend process restart by closing the Nest app and bootstrapping again against the same PostgreSQL data:

```bash
cd solve-tracker-backend
TEST_DATABASE_URL=postgresql://practice:practice_dev@localhost:5432/practice_tracker_test \
  pnpm test:persistence:integration
```

This is also run from `pnpm verify:phase-8`.

## Manual operator check (optional)

1. Start stack: PostgreSQL, `pnpm start:dev` in `solve-tracker-backend`, `pnpm dev` in `solve-tracker-frontend`.
2. Sign in, create a problem via UI.
3. Restart only the backend process (Ctrl+C and `pnpm start:dev` again).
4. Reload `/problems` — the problem remains visible.

## Docker Compose

```bash
cd solve-tracker-backend
pnpm db:migrate:docker
pnpm db:seed:docker     # if seeds enabled for the environment
docker compose restart backend
```