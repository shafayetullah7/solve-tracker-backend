# Phase 7C — Performance (read-path subset)

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- **[`seed-learning-perf-fixture.ts`](../../scripts/seed-learning-perf-fixture.ts)** — Idempotent `perf-learning@example.test` user; bulk Drizzle seed for guides, flat nodes, enrollments, progress, published assessments, finalized attempts. Tiers: `ci` (default), `large`, `stress` (`LEARNING_PERF_STRESS=1`, 2000 nodes).
- **[`benchmark-learning-reads.mjs`](../../scripts/benchmark-learning-reads.mjs)** — Reseeds fixture, `EXPLAIN (ANALYZE, BUFFERS)` on list/tree/progress/attempt SQL, warmed HTTP p50/p95 (20 iterations), optional `--ci` soft asserts.

**Backend product code:** none (plans use existing indexes). **Migrations:** none. **Load harness:** not required at measured scale.

## Environment

- Node **v26.13.1**, Postgres `practice_tracker_test` on `127.0.0.1:5437`
- Nest integration app (no SSR), local warm timings — not production SLO proof

## Fixture tiers

| Tier | Guides | Nodes (primary) | Assessments | Attempts / assessment | CI |
|------|--------|-----------------|-------------|----------------------|-----|
| ci | 10 | 100 | 2 | 5 | yes |
| large | 10 | 500 | 5 | 20 | manual |
| stress | 1 | 2000 | 10 | 5 | manual only (`LEARNING_PERF_STRESS=1`) |

## HTTP p95 (warm, ms)

| Route | Budget (subset) | ci | large |
|-------|-----------------|-----|-------|
| `GET /learning/guides` | ≤150 | **3.7** | **4.5** |
| `GET /learning/guides/:id/tree` | ≤300 | **5.5** | **8.0** |
| `GET .../attempts/:id` | ordinary read | **4.2** | **4.4** |

Stress tier not run in this slice (manual per [LEARNING_7_DECISIONS.md](./LEARNING_7_DECISIONS.md)).

## EXPLAIN (ci tier)

| Query | Index / plan notes |
|-------|------------------|
| Guide list count/page | Small cardinality; seq scan acceptable at 10 guides |
| Guide tree (guide ⨝ nodes) | Uses **learning_nodes** index path (`treePlanUsesNodesIndex: true`) |
| Node progress join | Nested loop on enrollment + progress |
| Best finalized scores | `GroupAggregate` on `learning_attempts` via `learning_attempts_enrollment_idx` |
| Attempt by id | Seq scan (single row by PK-scale table) |

## SQL statement count (tree)

Documented **~6** HTTP-layer round-trips in [`LearningGuidesService.tree`](../../src/modules/learning/learning-guides.service.ts) (tree, completed ids, enrollment, gated resolution, problem links, problem statuses). Exceeds architecture target of ≤8 including auth — **acceptable** at ci/large HTTP p95; no DB bottleneck found.

## Search / indexes

- List `strpos` search not stressed at 100 guides; **no** trigram/GIN added.
- **No** partial `finalized` attempt index — aggregate cost low at seeded attempt counts.

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `pnpm build` | pass |
| `tsx scripts/seed-learning-perf-fixture.ts --tier=ci` | pass |
| `node scripts/benchmark-learning-reads.mjs --tier=ci --ci` | pass |
| `pnpm test --run` | **331** passed |
| `pnpm api:check` | pass |
| `node scripts/test-learning-integration.mjs` | pass (**98**) |
| `node scripts/test-learning-privacy-integration.mjs` | pass (**22**) |

## Handoff

**7D** — Done: [LEARNING_7D_RESULTS.md](./LEARNING_7D_RESULTS.md).