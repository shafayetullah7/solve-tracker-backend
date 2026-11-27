# Learning 7.0 — baseline and launch decisions

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- [LEARNING_7_0_BASELINE.md](./LEARNING_7_0_BASELINE.md) — post-Phase 6 routes, controls, gaps, A01–A15 map
- [LEARNING_7_DECISIONS.md](./LEARNING_7_DECISIONS.md) — dark mode, Playwright, beta, perf subset, 7A/7B scope

**7.0 does not ship security, perf, or E2E implementation.**

## Pinned refs

| Repository | SHA |
|------------|-----|
| solve-tracker-backend | `497c696396ee0b44203c9d32b9ead395148009b2` |
| solve-tracker-frontend | `26efe4af99db25cab68e83472ba07e8f87105639` |

*(Docs and prior Phase 6/7 work since 6G signoff; SHAs moved from 6G baseline.)*

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `pnpm lint` (backend) | pass (existing warnings only) |
| `pnpm build` (backend) | pass |
| `pnpm test --run` (backend) | **327** passed |
| `pnpm test:e2e` (backend) | **7** passed (3 files) |
| `pnpm db:check` | pass |
| `pnpm api:check` (backend) | pass |
| `pnpm check` (frontend) | **491** passed |
| `pnpm build` (frontend) | pass |
| `pnpm api:check` (frontend) | pass |
| `pnpm db:migrate` (×2) | pass |
| `node scripts/test-learning-integration.mjs` | pass (**85** assertions) |
| `node scripts/test-problems-integration.mjs` | pass (**66** assertions) |
| `node scripts/test-topics-integration.mjs` | pass (**16** assertions) |

## Gap summary (handoff)

| Slice | Main gap |
|-------|----------|
| 7A | Learning rate limits; extended abuse/cross-account tests |
| 7B | Discover/profile privacy script (A15) |
| 7C | Benchmark list/tree/assessment; indexes |
| 7D | Migration + backup/restore drill |
| 7E | Playwright smoke, full regression, a11y/browser matrix |
| 7F | Ops metrics and log redaction |
| 7G | Export, deletion, privacy copy |
| 7H | Beta rollout and feedback |
| 7I | Phase 7 signoff |

## Handoff

**7A may start** — follow [LEARNING_7_DECISIONS.md](./LEARNING_7_DECISIONS.md) for incremental rate limits and security scope.