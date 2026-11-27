# Learning 6.0 — baseline signoff

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- [LEARNING_6_0_BASELINE.md](./LEARNING_6_0_BASELINE.md) — flags, routes, shell/overview/library deltas
- [LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md) — dark mode waived, IA, overview, metrics locks
- Guide list **search** + **archived status** integration asserts (+3)

**6.0 does not ship shell, overview, or library UI changes.**

## Pinned refs

| Repository | SHA |
|------------|-----|
| solve-tracker-backend | `ac6a649b1cc4c58fd730fbc9b0a69bed6168acf3` |
| solve-tracker-frontend | `93388d9aeade06c3e487f5e3dc8a772390b7cf9b` |

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `pnpm build` (backend) | pass |
| `pnpm test --run` (backend) | 327 passed |
| `pnpm api:check` (backend) | pass |
| `pnpm check` (frontend) | 448 passed |
| `node scripts/test-learning-integration.mjs` | pass (85 assertions) |
| `node scripts/test-problems-integration.mjs` | pass (66 assertions) |
| `node scripts/test-topics-integration.mjs` | pass (16 assertions) |

(`pnpm lint`, `pnpm db:check`, frontend `pnpm build` / `api:check` — unchanged from [BASELINE_RUN.md](./BASELINE_RUN.md) discipline; run before 6G signoff if needed.)

## Gap summary (handoff)

| Slice | Main gap |
|-------|----------|
| 6A | Nav order, labels, Create menu |
| 6B | Overview learning section + independent loaders |
| 6C | Formal activity contract doc |
| 6D | Library search/archive UI |
| 6E | Landing/onboarding copy |
| 6F | Light-theme responsive/a11y matrix (no dark mode) |

## Handoff

**6A may start** — follow [LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md) for labels and Create menu scope.