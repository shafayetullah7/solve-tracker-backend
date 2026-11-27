# Backend scripts

`package.json` keeps **tooling only** (build, unit tests, lint, database, OpenAPI). Integration suites, phase exit gates, and feature verifiers live here as `.mjs` files — run them with `node`, not new `pnpm` aliases.

Working directory: `solve-tracker-backend/`. Most HTTP integration scripts need a fresh build and `TEST_DATABASE_URL` pointing at a database whose name ends in `_test`.

```bash
pnpm build
export TEST_DATABASE_URL=postgresql://practice:practice_dev@127.0.0.1:5437/practice_tracker_test
node scripts/test-auth-integration.mjs
```

## PostgreSQL integration (by feature)

| Script | Notes |
| --- | --- |
| `test-auth-integration.mjs` | Auth HTTP + transactions; mocked email |
| `test-topics-integration.mjs` | Topics CRUD and isolation |
| `test-problems-integration.mjs` | Problems, progress-related matrix |
| `test-profile-integration.mjs` | Profile / media linkage |
| `test-learning-integration.mjs` | Learning guides API |
| `test-discover-integration.mjs` | Discover core |
| `test-discover-people-integration.mjs` | Discover people |
| `test-discover-compare-integration.mjs` | Compare flows |
| `test-discover-events-integration.mjs` | Discover events |
| `test-auth-provider-identities.mjs` | Google identity rows |
| `test-google-oauth-auth.mjs` | OAuth auth paths |
| `test-google-oauth-integration.mjs` | OAuth + Postgres |
| `test-risc-receipts.mjs` | RISC receipt store |
| `test-google-risc-handle.mjs` | RISC handler |
| `test-google-risc-http.mjs` | RISC HTTP |
| `test-user-handle-schema.mjs` | Handle schema (no build) |
| `test-backend-restart-persistence.mjs` | Restart persistence |

## Static / fast verifiers

| Script | Notes |
| --- | --- |
| `verify-google-oauth.mjs` | OAuth contract grep (run `pnpm build` first if code changed) |
| `verify-google-risc.mjs` | RISC contract |
| `verify-user-handle.mjs` | Handle contract |

## Exit orchestrators (optional regression umbrellas)

These chain builds, unit tests, integration scripts, and frontend checks. Use when replaying a historical gate; do not add `package.json` entries for them.

| Script | Purpose |
| --- | --- |
| `verify-phase-5-exit.mjs` … `verify-phase-9-exit.mjs` | MVP phase exit criteria |
| `verify-platform-p1.mjs` … `verify-platform-p4.mjs`, `verify-platform-cls.mjs` | Platform classification |
| `verify-discover-e1.mjs` … `verify-discover-e9.mjs`, `verify-discover.mjs` | Discover launch |
| `verify-google-oauth-exit.mjs`, `verify-google-risc-exit.mjs`, `verify-user-handle-exit.mjs` | Feature exit |

## Other utilities

| Script | Notes |
| --- | --- |
| `preflight-google-risc-endpoint.mjs` | RISC endpoint smoke |
| `sign-test-risc-set.mjs` | Sign test RISC payloads |
| `export-openapi.mjs` | OpenAPI snapshot (also via `pnpm api:export`) |
| `generate-api-types.mjs` | Types codegen (frontend calls via `pnpm api:generate`) |

Frontend smoke and contract scripts: `solve-tracker-frontend/scripts/README.md`.