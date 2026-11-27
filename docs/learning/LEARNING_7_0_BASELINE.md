# Phase 7.0 — hardening baseline (post-Phase 6)

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`  
**Prerequisite:** [LEARNING_6_PHASE_SIGNOFF.md](./LEARNING_6_PHASE_SIGNOFF.md)

Inventory for Phase 7 hardening slices. **No product changes in 7.0.**

---

## Feature flag and deployment

| Item | State |
|------|--------|
| Env | `VITE_LEARNING_GUIDES_ENABLED` — build-time; see [DEPLOY.md](../../../solve-tracker-frontend/docs/DEPLOY.md), [LEARNING_6_PHASE_SIGNOFF.md](./LEARNING_6_PHASE_SIGNOFF.md) §Deployment |
| Backend | Learning APIs available when migrations applied; **no** backend feature flag |
| Default prod | Flag **false** until beta ([LEARNING_7_DECISIONS.md](./LEARNING_7_DECISIONS.md)) |

---

## Frontend routes (`src/routes/app/learning/`)

| Route | Purpose |
|-------|---------|
| `/app/learning` | Library workspace (search, archive, pagination) |
| `/app/learning/new` | Create guide |
| `/app/learning/import` | Import preview/commit |
| `/app/learning/:guideId` | Guide overview |
| `/app/learning/:guideId/structure` | Structure editor |
| `/app/learning/:guideId/edit/:nodeId` | Node content editor |
| `/app/learning/:guideId/study/:nodeId` | Study shell |
| `/app/learning/:guideId/assessments/:assessmentId` | Assessment author shell |

Learner attempts run via study blocks and API (`AttemptsController`); no separate public attempt URL.

---

## Security controls (as implemented)

| Control | Location | Notes |
|---------|----------|--------|
| Authentication | `AccessGuard` on learning + assessments controllers | Cookie session |
| CSRF / mutation headers | `AuthSecurityGuard` | Origin + `X-Requested-With: practice` |
| Text XSS | `sanitizeTextBody` in [`learning-block-payload.ts`](../../src/modules/learning/learning-block-payload.ts) | Strip tags on text blocks |
| Hierarchy abuse | [`learning-hierarchy.ts`](../../src/modules/learning/learning-hierarchy.ts) | `MAX_NODES` 2000, `MAX_DEPTH` 32, `MAX_SIBLINGS` 500 |
| Repository quotas | [`learning-guide-mutations.repository.ts`](../../src/modules/learning/learning-guide-mutations.repository.ts) | `MAX_GUIDES` 100, `MAX_BLOCKS_PER_NODE` 200, `MAX_RECEIPTS` 10000, etc. |
| Import previews | [`learning-portability.service.ts`](../../src/modules/learning/learning-portability.service.ts) | Active preview cap (`LEARNING_IMPORT_LIMIT`) |

**7A delivered:** Process-local rate limits on import preview/commit and assessment attempt start ([`learning-rate-limit.module.ts`](../../src/modules/learning/learning-rate-limit.module.ts)). **Remaining gap:** general `/learning/*` mutation buckets per [SECURITY_RECOVERY_ARCHITECTURE.md](./SECURITY_RECOVERY_ARCHITECTURE.md).

**Gap (→ 7A/7E):** CSP / embed policy for learning content not separately audited beyond global [`node-csp.ts`](../../../solve-tracker-frontend/config/node-csp.ts).

---

## Integration coverage

| Script | Asserts | Learning scope |
|--------|---------|----------------|
| `test-learning-integration.mjs` | **98** | Guide/node/content, import, assessments, gated completion, cross-user **404** on foreign attempt and problem refs |
| `test-learning-privacy-integration.mjs` | **22** | Seeded learning + Discover/profile/public/progress negative matrix (7B, **A15**) |
| `test-problems-integration.mjs` | **66** | Coding regression; 5.x learning refs exercised in learning suite |
| `test-topics-integration.mjs` | **16** | Topics regression |

**Optional (7.0 inventory):** `test-discover-people-integration.mjs` — Discover rate limit 429; does not reference learning tables today.

---

## Performance

[PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md) defines targets and synthetic workloads. **7C** measured read-path subset — [LEARNING_7C_RESULTS.md](./LEARNING_7C_RESULTS.md); CI: `benchmark-learning-reads.mjs --tier=ci --ci`.

**7.0 decision:** 7C adopts **subset** first — `GET /learning/guides` (list), tree, progress aggregation, assessment attempt reads — before full stress harness.

---

## Phase 6 deferrals → Phase 7 owner

| Deferral | Owner slice |
|----------|-------------|
| Playwright smoke | 7E |
| Dark mode | 7.0 decision → waived through 7H by default |
| Flag removal | 7H (optional for 7I) |
| Formal screenshot archive | 7E (spot-check + matrix) |
| Full SECURITY rate/operation receipts | 7A incremental |

---

## Audit register A01–A15 (7.0 assessment)

| ID | Status | Owner |
|----|--------|-------|
| A01–A02 | Partial — media not in learning R1 blocks at scale | 7A, 7G |
| A03–A04 | Partial — owner guards + integration negatives; rate limits open | 7A |
| A05 | Partial — text sanitize; CSP/embed manual in 7E | 7A, 7E |
| A06 | Closed (Phase 5) | 7A spot-check |
| A07 | Closed (Phase 6C) | 7E regression |
| A08–A12 | Closed (Phase 6A–6E) | 7E matrix |
| A13 | Partial — no framework upgrade in Phase 7 | — |
| A14 | Ongoing | Each slice `api:check` |
| A15 | **Closed** (7B) | — |

---

## Gap summary (handoff to 7A–7I)

| Slice | Primary gap |
|-------|-------------|
| 7A | Rate limits, extended cross-account matrix, import abuse tests |
| 7B | — (closed 7B) |
| 7C | — (closed 7C) |
| 7D | — (closed 7D) |
| 7E | Playwright, e2e cumulative, browser/a11y matrix |
| 7F | Ops logging redaction, staging checklist |
| 7G | Export/delete policy for learning rows |
| 7H | Beta runbook and feedback |
| 7I | Phase 7 signoff |