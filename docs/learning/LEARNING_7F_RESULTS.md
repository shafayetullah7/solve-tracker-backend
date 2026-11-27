# Phase 7F — Operations

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- **[`audit-learning-safe-logging.mjs`](../../scripts/audit-learning-safe-logging.mjs)** — No `Logger` / `console.*` in learning + assessments; auth 5xx log uses fixed text only.
- **[`test-learning-ops-integration.mjs`](../../scripts/test-learning-ops-integration.mjs)** — Health/readiness, learner attempt responses omit grading keys, safe 404 shape, oversize import preview rejected.
- **[`verify-learning-7f.mjs`](../../scripts/verify-learning-7f.mjs)** — Audit + cumulative 7E static + ops integration; optional `OPS_LIVE=1` for `GET /health/ready` against `BASE_URL`.

**Product code:** none.

## Static / CI gates

```text
export TEST_DATABASE_URL=postgresql://…/practice_tracker_test
pnpm build
node scripts/verify-learning-7f.mjs
```

## Staging / production checklist

| Step | Action |
|------|--------|
| 1 | Run `pnpm db:migrate` on target database before new backend ([PRODUCTION.md](../../PRODUCTION.md), [LEARNING_7D_RESULTS.md](./LEARNING_7D_RESULTS.md)). |
| 2 | Deploy backend; confirm `GET /health` (liveness) and `GET /health/ready` (readiness, `Cache-Control: no-store`). |
| 3 | Staging frontend: rebuild with `VITE_LEARNING_GUIDES_ENABLED=true` ([DEPLOY.md](../../../solve-tracker-frontend/docs/DEPLOY.md)). |
| 4 | Production pre-beta: flag **false**; learning APIs exist post-migrate; rollback = prior backend + flag-off frontend build. |
| 5 | Smoke: `node scripts/test-learning-ops-integration.mjs`; staging optional `E2E_LIVE=1` SSR ([LEARNING_7E_RESULTS.md](./LEARNING_7E_RESULTS.md)) + manual learning journey. |
| 6 | Backup: logical `pg_dump`; rehearsal `rehearse-learning-migration-upgrade.mjs` when client tools on PATH. |

## Resource limits (enforced vs proposed)

| Category | Enforced today | Reference |
|----------|----------------|-----------|
| Import rate | 10/h default; env `LEARNING_RATE_LIMIT_IMPORT_PER_HOUR` | [`learning.config.ts`](../../src/modules/learning/learning.config.ts), 7A integration 429 |
| Attempt start rate | 30/h default; env `LEARNING_RATE_LIMIT_ATTEMPT_START_PER_HOUR` | same |
| Import payload | `content` max 8_388_608 bytes; portable node/block caps | [`learning-portable.schema.ts`](../../src/modules/learning/schemas/learning-portable.schema.ts) |
| Account/guide quotas | **Proposed** only | [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md) |
| Multi-instance limits | Process-local limiters; use edge policy for scale | [SECURITY_RECOVERY_ARCHITECTURE.md](./SECURITY_RECOVERY_ARCHITECTURE.md) |

## Logging and safe error reporting

| Check | Result |
|-------|--------|
| Learning + assessments modules | No application loggers (7F audit) |
| Auth 5xx filter | Generic log line + `INTERNAL_ERROR` body |
| Learner attempt HTTP | No `gradingConfig` / answer-key fields (ops integration) |
| 7A deferral: operation receipts / full abuse matrix | **Not implemented** — documented deferral |

Per [LEARNING_7_DECISIONS.md](./LEARNING_7_DECISIONS.md): no answer keys, note text, or tokens in application logs.

## Operational metrics

**In 7F:** health probes, integration/benchmark gate scripts, reverse-proxy access logs.

**Deferred:** in-app route histograms, request IDs, and Prometheus-style metrics ([SECURITY_RECOVERY_ARCHITECTURE.md](./SECURITY_RECOVERY_ARCHITECTURE.md)) — revisit after 7H if beta needs dashboards.

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `node scripts/audit-learning-safe-logging.mjs` | pass |
| `node scripts/test-learning-ops-integration.mjs` | pass (**12** assertions) |
| `node scripts/verify-learning-7f.mjs` | pass (includes 7E static) |
| Backend unit (via 7E chain) | **331** |
| Learning integrations (via 7E chain) | **98** + privacy **22** |

## Handoff

**7G** — Export, deletion, privacy copy, feedback/abuse for beta.