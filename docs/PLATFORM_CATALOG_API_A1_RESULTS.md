# PLATFORM-API A1 — Backend reference API (results)

**Status:** complete (2026-11-18).  
**Plan:** [PLATFORM_CATALOG_API_PHASED_PLAN.md](PLATFORM_CATALOG_API_PHASED_PLAN.md) § A1.

## Delivered

| Item | Detail |
| --- | --- |
| Route | `GET /platforms` |
| Auth | Public (no `AuthSecurityGuard` / `AccessGuard`) |
| Cache | `Cache-Control: public, max-age=3600` |
| Source | [`PLATFORM_CATALOG`](../src/shared/platform-catalog.ts) via `PlatformsService.list()` |
| Response | `{ items: [{ slug, name, baseUrl, urlHosts }] }` — no `other` slug |
| OpenAPI | `pnpm api:export` — tag **Platforms** |

## Code

- Module: [`src/modules/platforms/`](../src/modules/platforms/)
- Registered in [`app.module.ts`](../src/app.module.ts)

## Verification

```bash
cd solve-tracker-backend
pnpm test
pnpm test:e2e    # includes test/platforms.e2e-spec.ts
pnpm build
pnpm api:export
pnpm api:check
```

## Next phase

**A3** — Catalog context and cache. See [PLATFORM_CATALOG_API_A2_RESULTS.md](PLATFORM_CATALOG_API_A2_RESULTS.md).