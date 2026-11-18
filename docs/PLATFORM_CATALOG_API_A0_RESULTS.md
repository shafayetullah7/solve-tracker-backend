# PLATFORM-API A0 — Design lock and repo hygiene (results)

**Status:** complete (2026-11-18).  
**Plan:** [PLATFORM_CATALOG_API_PHASED_PLAN.md](PLATFORM_CATALOG_API_PHASED_PLAN.md) § A0.

## Locked decisions

| Decision | Locked value |
| --- | --- |
| Runtime source | `PLATFORM_CATALOG` in code (not DB) for `GET /platforms` |
| Auth | **Public** (no `AccessGuard`) |
| Response shape | `{ items: [{ slug, name, baseUrl, urlHosts }] }` |
| Synthetic `other` | **Omit** from API; library filter appends `other` client-side (same as `LIST_PLATFORM_FILTER_SLUGS`) |
| SSR | Client fetch after hydrate for `/app`; landing may use public `GET /platforms` later (A3) |
| Production fallback | No bundled catalog snapshot after A5 |

## Hygiene deliverables

- Monorepo sibling folders match GitHub: `solve-tracker-backend` / `solve-tracker-frontend`; scripts use `../solve-tracker-backend`.
- `solve-tracker-frontend` `pnpm verify:catalog` and `api:generate` resolve the sibling backend package.
- `solve-tracker-frontend` `pnpm verify:repo-paths` rejects short `../backend` / `../cp-frontend` paths in scanned artifacts.

## Next phase

**A2** — Frontend typed client (`platforms.api.ts`, `pnpm api:generate`). See [PLATFORM_CATALOG_API_A1_RESULTS.md](PLATFORM_CATALOG_API_A1_RESULTS.md).