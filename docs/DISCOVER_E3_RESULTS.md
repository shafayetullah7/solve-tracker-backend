# DISCOVER E3 — Results

**Phase:** D3 practice profile and public topic pages  
**Gate:** `pnpm verify:discover-e3`

## Shipped

- `people.api.ts` with `PROFILE_NOT_FOUND` → unavailable union
- Read-only dashboard reuse (`readOnly` / `hrefFor`)
- Routes `/app/u/:handle` and `/app/u/:handle/topics/:topicId`
- People components (header, unavailable, view-as banner, topic board, list header, problem rows)
- Self preview + copy link on profile visibility panel
- `nav-active` discover section for `/app/u/*` and `/app/discover*`

## Commands

```bash
# Backend + E2 integration
export TEST_DATABASE_URL=postgresql://…/practice_test
pnpm verify:discover-e3

# Manual (§0.5)
DISCOVER_MODE=full pnpm start:dev          # backend
VITE_DISCOVER_MODE=full pnpm dev         # frontend
pnpm db:seed:discover-demo
```

## UX evidence

Capture under `docs/discover-ux/e3/`:

| Area | States |
| --- | --- |
| Profile | summary-only, topics, self, unavailable, section error, mobile 375px |
| Public topic | populated, empty filter, unavailable, error+retry, mobile |

## Sign-off

- [x] E3.1–E3.7 per [PRACTICE_DISCOVERY_EXECUTION_PLAN.md](PRACTICE_DISCOVERY_EXECUTION_PLAN.md)
- [x] Next step: **E4.1**