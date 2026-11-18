# DISCOVER E4 — Results

**Phase:** D4 Discover people  
**Gate:** `pnpm verify:discover-e4`

## Shipped

- Backend: `discover.repository`, `rails.ts`, `discover.service`, `discover.controller`, events table, starter seed, `GET /people/:handle/similar`, partial visibility index
- Frontend: `/app/discover` (For you, People), search combobox, onboarding sheet, sidebar Discover, dashboard peers card, profile similar rail

## Commands

```bash
export TEST_DATABASE_URL=postgresql://…/practice_test
pnpm verify:discover-e4
```

## EXPLAIN

Run `EXPLAIN (ANALYZE, BUFFERS)` on eligible-user query after `db:seed` + `db:seed:discover-demo`; partial index `discover_user_visibility_idx` supports non-private filter.

## UX evidence

Capture under `docs/discover-ux/e4/` per execution plan §0.6.

## Integration

`scripts/test-discover-integration.mjs` — privacy scan, starter-only-in-lists, search, events allow-list.