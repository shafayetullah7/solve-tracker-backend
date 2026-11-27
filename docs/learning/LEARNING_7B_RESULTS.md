# Phase 7B — Privacy regression (Discover / profile)

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- **[`test-learning-privacy-integration.mjs`](../../scripts/test-learning-privacy-integration.mjs)** — Seeds owner A with guide, node, content markers, assessment attempt, enrollment, and problem backlink; enables `publicWeb` + `practiceVisibility: summary`. Viewer B probes Discover/public/progress surfaces. JSON scanners: substring needles (UUIDs + marker strings) and forbidden keys (`guideId`, `attemptId`, etc.).
- **Docs** — This file; `scripts/README.md`; roadmap **7B**; `BASELINE_RUN.md`; audit **A15** closed in baseline.

**Backend product code:** none (no leaks found). **Frontend:** none. **Notes API:** **NA** (not shipped).

## Route matrix

| Surface | Request | Actor | Result |
|---------|---------|-------|--------|
| Unauth learning list | `GET /learning/guides` | none | **401** |
| Unauth learning detail | `GET /learning/guides/{guideId}` | none | **401** |
| Public profile | `GET /public/people/{handle}` | none | **200**, no needles |
| Discover people | `GET /people/{handle}` | B | **200**, no needles |
| Discover search | `GET /discover/search?q={handle}` | B | Owner in `items`, no needles |
| Discover hub | `GET /discover/for-you` | B | No needles |
| Share stats | `GET /users/me/share-stats` | A | Schema intact, no needles |
| Progress activity | `GET /progress/activity` | A | No learning keys / needles |
| Progress summaries | `GET /progress` | A | No needles |
| Cross-owner refs | `GET /problems/{id}/learning-references` | B on A's problem | **404** |

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `pnpm build` | pass |
| `node scripts/test-learning-privacy-integration.mjs` | pass (**22** assertions) |
| `pnpm test --run` | **331** passed |
| `pnpm api:check` | pass |
| `node scripts/test-learning-integration.mjs` | pass (**98** assertions) |
| `node scripts/test-discover-public-integration.mjs` | pass |

## Audit

| ID | Status |
|----|--------|
| **A15** | **Closed** — Discover/profile/public/progress scanned with seeded learning artifacts |

## Handoff

**7C** — Done: [LEARNING_7C_RESULTS.md](./LEARNING_7C_RESULTS.md).