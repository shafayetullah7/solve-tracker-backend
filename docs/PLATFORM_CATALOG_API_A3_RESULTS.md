# PLATFORM-API A3 — Catalog context and cache (results)

**Status:** complete (2026-11-18).  
**Plan:** [PLATFORM_CATALOG_API_PHASED_PLAN.md](PLATFORM_CATALOG_API_PHASED_PLAN.md) § A3.

## Delivered

| Item | Detail |
| --- | --- |
| Runtime | [`catalog-runtime.ts`](../../solve-tracker-frontend/src/lib/platforms/catalog-runtime.ts) — URL/slug helpers over `entries[]` |
| Provider | [`platform-catalog-context.tsx`](../../solve-tracker-frontend/src/lib/platforms/platform-catalog-context.tsx) |
| Mount | [`routes/app.tsx`](../../solve-tracker-frontend/src/routes/app.tsx) inside `RequireSession` (Option A) |
| Cache | In-memory for SPA session; `loadCatalog` idempotent; `reloadCatalog` force-refresh |
| Hooks | `usePlatformCatalog`, `usePlatformFilterOptions`, `useCatalogEntries`, `useRuntimePlatformHelpers` |

## Behavior

- Eager `GET /platforms` via `createPlatformsApi(auth.productClient)` when `status` is `idle`.
- App shell renders while `loading`; filter options empty until `ready` (**A4** migrated consumers off static catalog).
- `usePlatformFilterOptions()` returns `[]` until `ready`, then catalog labels + synthetic `other`.

## Tests

- [`catalog-runtime.test.ts`](../../solve-tracker-frontend/src/lib/platforms/catalog-runtime.test.ts)
- [`platform-catalog-context.test.tsx`](../../solve-tracker-frontend/src/lib/platforms/platform-catalog-context.test.tsx)

```bash
cd solve-tracker-frontend && pnpm check
```

## Next phase

**A5** — Remove duplicate frontend catalog file. See [PLATFORM_CATALOG_API_A4_RESULTS.md](PLATFORM_CATALOG_API_A4_RESULTS.md).