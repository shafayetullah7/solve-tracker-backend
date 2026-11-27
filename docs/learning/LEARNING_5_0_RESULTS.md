# Learning 5.0 — baseline signoff

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- [LEARNING_5_0_BASELINE.md](./LEARNING_5_0_BASELINE.md) — migration blueprint, gating, payload/resolution
- [LEARNING_5_PROBLEM_LINK_CONTRACT.md](./LEARNING_5_PROBLEM_LINK_CONTRACT.md) — Nest port, privacy, wiring
- API route appendix locked in [LEARNING_5_SLICE_PLAN.md](./LEARNING_5_SLICE_PLAN.md)
- Enum note in [LEARNING_ENUM_MIGRATION.md](./LEARNING_ENUM_MIGRATION.md)

**5.0 does not ship migrations, schema TS, or ProblemsModule exports.**

## Gates (Phase 4 regression, 2026-11-27)

| Gate | Result |
|------|--------|
| `pnpm build` | pass |
| `pnpm test` | 307 passed |
| `pnpm api:check` | pass |
| `node scripts/test-learning-integration.mjs` | pass (46 assertions) |
| `pnpm check` (frontend) | pass (439 tests) |

## Handoff

**5A** may start: enum `problem` + `learning_problem_links` per baseline blueprint.