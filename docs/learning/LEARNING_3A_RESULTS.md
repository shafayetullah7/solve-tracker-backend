# Learning 3A — guide/tree slice results

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Pinned SHAs

| Repo | SHA |
|------|-----|
| solve-tracker-backend | `d603b8392ff83cdb2f45b3a95493c7155327bc1c` |
| solve-tracker-frontend | `e7b5074e092fef7484623fa982554772045470d2` |

## Automated verification

| Gate | Result |
|------|--------|
| Backend `pnpm lint` | pass (existing warnings) |
| Backend `pnpm test` | 293 passed |
| Backend `pnpm build` + `db:check` + `api:check` | pass |
| `node scripts/test-learning-integration.mjs` | pass (27 assertions; includes move/replay/stale revision) |
| Frontend `pnpm check` | 433 passed (post-3B client tests) |
| Frontend `pnpm build` + `api:check` | pass |

## 3A scope delivered

- Backend: guide CRUD, tree, node CRUD/patch/move/copy/restore/delete, lifecycle archive, enrollment/resume, recovery, operation receipts.
- Frontend: library, create guide, overview + outline, study navigation (`VITE_LEARNING_GUIDES_ENABLED`); move/reorder UI deferred (API-only).
- Integration: cross-account 404, revision conflicts, cycle guard, archive write guard, recovery listing.

## Intentionally deferred to 3B+

- Block content, editor route, move/reorder UI controls (API move covered in integration).
- High-fidelity designs; multi-viewport screenshot archive.
- Assessments, import/export, media in blocks.

## Manual smoke (optional)

With backend on `:3000`, frontend dev on `:3001`, flag on: library → guide → study step → reload preserves resume via enrollment API.