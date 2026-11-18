# DISCOVER E2 — Results

**Phase:** D2 people read API and visibility core  
**Gate:** `pnpm verify:discover-e2`

## Shipped

- `DiscoverModule` with `DiscoverModeGuard`, profile read rate limiting, TTL cache, visibility projections
- `GET /people/:handle` (+ activity, topics, public topic header, public problems)
- Migration `20261118164259_discover-counters`
- `scripts/test-discover-people-integration.mjs`, extended `seed-discover-demo.ts`

## Visibility matrix (integration-tested)

| Viewer | Subject | Route | Expected |
| --- | --- | --- | --- |
| demo-viewer | demo-private | `GET /people/demo-private` | 404 `PROFILE_NOT_FOUND` |
| demo-viewer | unknown | `GET /people/no-such-handle` | 404 (identical body to private) |
| demo-viewer | demo-summary | `GET /people/Demo-Summary` | 200 summary keys only |
| demo-viewer | demo-summary | `GET /people/demo-summary/topics` | 404 (summary cannot view topics) |
| demo-viewer | demo-topics | `GET /people/demo-topics/topics` | 200; public rows include `id` |
| demo-viewer | demo-trap | any | 404 (private owner; public-looking topic never exposed) |
| demo-summary (`sharing`) | self | `GET /people/demo-summary` | 200 |
| demo-summary (`sharing`) | demo-topics | `GET /people/demo-topics` | 404 |

## Commands

```bash
export TEST_DATABASE_URL=postgresql://…/practice_test
pnpm verify:discover-e2
```

Unit tests: 253+ (includes discover guards, visibility, cache, rate limit, histogram, counters dedupe).

## Sign-off

- [x] E2.1–E2.8 complete per [PRACTICE_DISCOVERY_EXECUTION_PLAN.md](PRACTICE_DISCOVERY_EXECUTION_PLAN.md)
- [x] Next execution step: **E3.1**