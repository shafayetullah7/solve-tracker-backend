# PLATFORM-API A4 — Migrate consumers (results)

**Status:** complete (2026-11-18).  
**Plan:** [PLATFORM_CATALOG_API_PHASED_PLAN.md](PLATFORM_CATALOG_API_PHASED_PLAN.md) § A4.

## Migrated

| Area | Change |
| --- | --- |
| Library toolbar | `usePlatformFilterOptions` + load/error retry on [`ProblemBrowseToolbar`](../../solve-tracker-frontend/src/components/problems/ProblemBrowseToolbar.tsx) |
| Filter chips | `platformOptions` param on [`browse-active-filters`](../../solve-tracker-frontend/src/lib/problems/browse-active-filters.ts) |
| Browse URL | `platform=other` in [`browse-query`](../../solve-tracker-frontend/src/lib/problems/browse-query.ts) |
| Problem form | `useRuntimePlatformHelpers` in [`ProblemFormFields`](../../solve-tracker-frontend/src/components/problems/ProblemFormFields.tsx) |
| Platform UI | [`PlatformMark`](../../solve-tracker-frontend/src/components/platforms/PlatformMark.tsx) / [`PlatformIcon`](../../solve-tracker-frontend/src/components/platforms/PlatformIcon.tsx) with optional catalog + static fallback |
| Dashboard links | [`dashboard-platform-href`](../../solve-tracker-frontend/src/lib/dashboard/dashboard-platform-href.ts) trusts API slugs |
| Landing | Public `GET /platforms` in [`LandingPlatforms`](../../solve-tracker-frontend/src/components/landing/LandingPlatforms.tsx); flush name-sorted tile grid (no marketing heading; `sectionAriaLabel` only) |
| Tests | [`catalog-fixture`](../../solve-tracker-frontend/src/lib/platforms/catalog-fixture.ts); runtime-based [`platform-display.test`](../../solve-tracker-frontend/src/lib/problems/platform-display.test.ts) |

## Context

- `createContext<... | null>(null)` for Solid 2 optional reads.
- `useOptionalPlatformCatalog`, `usePlatformLabels`, optional `useRuntimePlatformHelpers` with static fallback outside `/app`.

## Verification

```bash
cd solve-tracker-frontend && pnpm check
```

## Next phase

**A5** — complete; see [PLATFORM_CATALOG_API_A5_RESULTS.md](PLATFORM_CATALOG_API_A5_RESULTS.md).