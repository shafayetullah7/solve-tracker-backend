# PLATFORM-API — results summary

**Codename:** PLATFORM-API · **Plan:** [PLATFORM_CATALOG_API_PHASED_PLAN.md](PLATFORM_CATALOG_API_PHASED_PLAN.md)  
**Status:** **A0–A6 complete** (2026-11-18). **A7** deferred (not planned — client URL preview remains catalog-backed).

## Phase status

| Phase | Summary | Results |
| --- | --- | --- |
| **A0** | Design lock, repo paths | [A0](PLATFORM_CATALOG_API_A0_RESULTS.md) |
| **A1** | `GET /platforms` | [A1](PLATFORM_CATALOG_API_A1_RESULTS.md) |
| **A2** | `platforms.api.ts` | [A2](PLATFORM_CATALOG_API_A2_RESULTS.md) |
| **A3** | Catalog provider + runtime helpers | [A3](PLATFORM_CATALOG_API_A3_RESULTS.md) |
| **A4** | UI consumers migrated | [A4](PLATFORM_CATALOG_API_A4_RESULTS.md) |
| **A5** | Frontend duplicate catalog removed | [A5](PLATFORM_CATALOG_API_A5_RESULTS.md) |
| **A6** | `verify:platform-api` + ops/docs | [A6](PLATFORM_CATALOG_API_A6_RESULTS.md) |
| **A7** | Optional `POST /platforms/classify` | Deferred |

## Contributor ops (catalog change)

1. Edit **`solve-tracker-backend/src/shared/platform-catalog.ts`** only.
2. Backend unit tests + `platform-catalog.spec.ts`.
3. `pnpm api:export` / `api:check` (backend); `pnpm api:generate` (frontend); sync **`CATALOG_SLUGS`** if enum changed.
4. `pnpm verify:platform-api` (or `verify:platform-api:full` before release).
5. Deploy **backend**; clients pick up judges on next `GET /platforms` fetch.
6. **`pnpm db:backfill:platform-slugs`** when `urlHosts` rules change on existing data.

## Verification commands

| Command | Where | Purpose |
| --- | --- | --- |
| `pnpm verify:platform-api` | frontend | Catalog ↔ OpenAPI ↔ types ↔ `CATALOG_SLUGS` |
| `pnpm verify:platform-api:full` | frontend | + `api:check` both packages |
| `pnpm verify:catalog` | frontend | Alias of `verify:platform-api` |
| `pnpm verify:platform-cls` | backend | P1–P4 integration + frontend contract |

## Success criteria (met)

- No frontend `PLATFORM_CATALOG` array; runtime list from API.
- Single backend edit location documented across conventions, DEPLOY, PLATFORM-CLS Ops.
- OpenAPI + generated types include `GET /platforms`.