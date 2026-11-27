# Phase 7A — Security and abuse limits

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- **[`learning.config.ts`](../../src/modules/learning/learning.config.ts)** — Import (10/h) and attempt-start (30/h) defaults; env overrides `LEARNING_RATE_LIMIT_IMPORT_PER_HOUR`, `LEARNING_RATE_LIMIT_ATTEMPT_START_PER_HOUR`.
- **Rate limiters + guards** — [`learning-rate-limit.module.ts`](../../src/modules/learning/learning-rate-limit.module.ts); wired on `POST /learning/imports/preview|commit` and `POST .../assessments/:id/attempts`.
- **Integration** — +13 asserts in [`test-learning-integration.mjs`](../../scripts/test-learning-integration.mjs): cross-account nested routes, CSRF, link scheme, import 429, foreign import commit.
- **Unit** — `learning-import-rate-limit.guard.spec.ts`, `learning-attempt-rate-limit.guard.spec.ts`.

**Frontend:** none. **OpenAPI:** unchanged.

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `pnpm lint` | pass |
| `pnpm build` | pass |
| `pnpm test --run` | **331** passed (+4) |
| `pnpm test:e2e` | 7 passed |
| `pnpm api:check` | pass |
| `node scripts/test-learning-integration.mjs` | pass (**98** assertions, +13) |
| `node scripts/test-problems-integration.mjs` | pass (66 assertions) |
| `pnpm check` (frontend) | pass (491 tests) |

## Follow-up (not 7A)

| Item | Target |
|------|--------|
| Rate limits on general `/learning/*` mutations | Later 7A+ or ops tuning |
| Attempt save/submit throttling | Documented deferral |
| Operation receipts / full SECURITY abuse matrix | Phase 7F / architecture |
| Media private delivery (A01–A02) | 7A spot-check only |
| CSP / embed manual audit | 7E |

## Handoff

**7B** — `test-learning-privacy-integration.mjs` (Discover/profile + learning seed).