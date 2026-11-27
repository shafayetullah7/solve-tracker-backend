# Phase 7E — Regression, E2E, accessibility

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- **[`seed-learning-e2e.ts`](../../scripts/seed-learning-e2e.ts)** — optional manual staging fixture (`e2e-learning@example.test`, guide/node; emits `E2E_LEARNING_JSON`).
- **[`verify-learning-7e.mjs`](../../scripts/verify-learning-7e.mjs)** — Cumulative static gates; `E2E_LIVE=1` adds `verify-ssr-2` only (no browser automation in repo).

**Playwright:** **removed** per operator preference — browser smoke is Vitest + integration scripts + manual/staging. See [LEARNING_7_DECISIONS.md](./LEARNING_7_DECISIONS.md).

**Product code:** none unless regression finds blockers.

## Static gates

```text
node scripts/verify-learning-7e.mjs
```

Includes: `db:check`, backend lint/test/e2e/build/api, learning/privacy/perf/rehearsal/problems/topics integrations, frontend `pnpm check` + build + api:check.

## Live smoke (operator)

```text
# Backend :3000 + TEST_DATABASE_URL migrated; frontend :3001
E2E_LIVE=1 node scripts/verify-learning-7e.mjs
```

Optional manual journey: `tsx scripts/seed-learning-e2e.ts` then sign in with printed credentials and walk library → study.

## 6F matrix closure (summary)

| Category | 7E result |
|----------|-----------|
| STRESS / MOT / FLAG (Vitest) | **PASS** ([LEARNING_6F_RESULTS.md](./LEARNING_6F_RESULTS.md)) |
| FLAG on library/study | **PASS** (Vitest + learning integration; staging manual) |
| FLAG off nav | **PASS** (Vitest sidebar) |
| A11y learning routes | **PASS** (Vitest/a11y unit coverage; manual staging for full axe) |
| V\*/Z200/KB | **PASS** spot-check; no new FAIL |
| TREE / dark | **NA** |

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `node scripts/verify-learning-7e.mjs` | pass (static) |
| Backend unit | **331** |
| Backend e2e | **7** |
| Integrations | learning **98**, privacy **22**, problems **66**, topics **16** |

`E2E_LIVE=1`: SSR smoke only when backend `:3000` and frontend `:3001` are up.

## Handoff

**7F** — Done: [LEARNING_7F_RESULTS.md](./LEARNING_7F_RESULTS.md).