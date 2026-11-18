# Discover E6 results

**Gate:** `pnpm verify:discover-e6` (requires `TEST_DATABASE_URL` ending in `_test`).

## Delivered scope

- **E6.1–E6.3:** `compare.ts`, `insights.ts`, `CompareService`, compare/benchmark routes, OpenAPI.
- **E6.4:** `POST /people/:handle/topics/:topicId/copy`, copy rate limit, `recordTopicCopy`; frontend copy topic button and in-place **Add** on public/hub problem rows.
- **E6.5–E6.6:** `/app/u/:handle/compare`, `/app/discover/compare`, compare components, profile/card/rail entry points.
- **E6.7:** `DiscoverBenchmarkCard` under dashboard stats strip.
- **E6.8:** `GET /users/me/share-stats`; topics row + visibility panel stats lines.
- **E6.9–E6.11:** `test-discover-compare-integration.mjs`, `e2e/discover-compare.spec.ts`, `verify-discover-e6.mjs`.

## Insight thresholds (encoded in `discover.config.ts`)

- Cadence gap: active-weeks delta ≥ 2 or solves/week delta ≥ 1.0.
- Topic/platform share gaps: ≥ 15 percentage points.
- Max insights: 4 (`INSIGHT_MAX`).

## Manual / E2E

- Set `E2E_DISCOVER_SEED=1` and run `pnpm exec playwright test e2e/discover-compare.spec.ts` from `solve-tracker-frontend`.