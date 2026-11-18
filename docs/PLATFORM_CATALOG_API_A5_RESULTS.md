# PLATFORM-API A5 — Remove duplicate catalog file (results)

**Status:** complete (2026-11-18).  
**Plan:** [PLATFORM_CATALOG_API_PHASED_PLAN.md](PLATFORM_CATALOG_API_PHASED_PLAN.md) § A5.

## Removed

- Deleted [`solve-tracker-frontend/src/lib/platforms/platform-catalog.ts`](../../solve-tracker-frontend/src/lib/platforms/platform-catalog.ts) (full judge row duplicate).

## Added / changed

| Item | Purpose |
| --- | --- |
| [`platform-slugs.ts`](../../solve-tracker-frontend/src/lib/platforms/platform-slugs.ts) | `CATALOG_SLUGS`, `isKnownCatalogSlug`, `isStoredPlatformSlug`, decode set, fallback labels/preview without API rows |
| [`catalog.ts`](../../solve-tracker-frontend/src/lib/platforms/catalog.ts) | Barrel: runtime + slugs + context only |
| API decode | `platforms.api`, `problems.api`, `progress.api`, `browse-query` use `platform-slugs` |
| Context / UI | No static catalog fallbacks; URL slug detection only when catalog `ready` |
| [`verify-platform-api.mjs`](../../solve-tracker-frontend/scripts/verify-platform-api.mjs) | Superseded in **A6** — contract gate (see A6 results) |

## Ops (add or change a judge)

1. Edit [`solve-tracker-backend/src/shared/platform-catalog.ts`](../../solve-tracker-backend/src/shared/platform-catalog.ts).
2. `api:export` / `api:check` (backend); `pnpm api:generate` (frontend) if slug enum changed; sync `CATALOG_SLUGS` in `platform-slugs.ts`.
3. `pnpm verify:platform-api` (or `verify:platform-api:full` before release).
4. Deploy backend.

Frontend runtime picks up names and `urlHosts` on the next `GET /platforms` after deploy.

## Verification

```bash
cd solve-tracker-frontend && pnpm check
pnpm verify:platform-api
rg 'platform-catalog\.ts|PLATFORM_CATALOG' solve-tracker-frontend/src   # expect no matches
```

**354** unit tests passing.

## Next phase

**A6** — complete; see [PLATFORM_CATALOG_API_A6_RESULTS.md](PLATFORM_CATALOG_API_A6_RESULTS.md) and [PLATFORM_CATALOG_API_RESULTS.md](PLATFORM_CATALOG_API_RESULTS.md).