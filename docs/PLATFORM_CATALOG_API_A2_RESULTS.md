# PLATFORM-API A2 — Frontend typed client (results)

**Status:** complete (2026-11-18).  
**Plan:** [PLATFORM_CATALOG_API_PHASED_PLAN.md](PLATFORM_CATALOG_API_PHASED_PLAN.md) § A2.

## Delivered

| Item | Detail |
| --- | --- |
| Types | `pnpm api:generate` — `operations["PlatformsController_list"]` in `solve-tracker-frontend/src/lib/api/generat../solve-tracker-backend.d.ts` |
| Module | [`solve-tracker-frontend/src/lib/api/modules/platforms.api.ts`](../../solve-tracker-frontend/src/lib/api/modules/platforms.api.ts) |
| API | `createPlatformsApi(client).listPlatforms(signal?)` → `{ items: PlatformCatalogItem[] }` |
| Recovery | `recoverAuth: false` (public `GET /platforms`) |
| Tests | [`platforms.api.test.ts`](../../solve-tracker-frontend/src/lib/api/modules/platforms.api.test.ts) |

## Usage (not wired in routes yet)

```ts
import { createPlatformsApi } from "./lib/api/modules/platforms.api";

const platforms = createPlatformsApi(auth.productClient); // or rawClient
const { items } = await platforms.listPlatforms();
```

## Verification

```bash
cd solve-tracker-frontend
pnpm api:generate
pnpm api:check
pnpm check
```

## Next phase

**A4** — Migrate UI consumers to catalog hooks. See [PLATFORM_CATALOG_API_A3_RESULTS.md](PLATFORM_CATALOG_API_A3_RESULTS.md).