# Phase 6D — Guide library UX

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- **[`resume-guide.ts`](../../../solve-tracker-frontend/src/lib/learning/resume-guide.ts)** — Shared resume href logic; dashboard loader refactored to use it.
- **[`library-query.ts`](../../../solve-tracker-frontend/src/lib/learning/library-query.ts)** — URL-synced `search`, `status` (active/archived), pagination (default page size 25).
- **[`learning-guides.api.ts`](../../../solve-tracker-frontend/src/lib/api/modules/learning-guides.api.ts)** — `lifecycle()` client for archive/unarchive.
- **[`GuideLibraryWorkspace.tsx`](../../../solve-tracker-frontend/src/components/learning/guides/GuideLibraryWorkspace.tsx)** — Search (debounced), Active/Archived tabs, pagination, Continue/Overview, Archive/Unarchive.
- **[`routes/app/learning/index.tsx`](../../../solve-tracker-frontend/src/routes/app/learning/index.tsx)** — Thin route shell.

**Backend:** none. List/search/archived already covered by integration (`test-learning-integration.mjs`, 85 assertions through 6.0).

## Resume strategy

Per row: **`GET enrollment` only** (no tree fan-out).  
- `resumeNodeId` → study URL (**Continue**).  
- No resume pointer → guide overview (**Open guide**).  
Dashboard Continue learning (6B) still uses enrollment + tree for progress and first-step fallback.

## Tests

| File | Coverage |
|------|----------|
| `resume-guide.test.ts` | Href fallbacks |
| `library-query.test.ts` | Parse/build/href |
| `learning-guides.api.test.ts` | `list` query + `lifecycle` |
| `GuideLibraryWorkspace.test.tsx` | Load, archived tab, archive action |
| `load-dashboard-continue-learning.test.ts` | Unchanged behavior via shared helper |

Frontend **`pnpm check`:** **476** tests (+12).

## Manual QA checklist

| Check | Criteria |
|-------|----------|
| Search | Filters by title/description; updates URL |
| Active / Archived | Tab links; correct list status |
| Archive | Row leaves Active; visible under Archived |
| Unarchive | Returns to Active |
| Resume | Continue → study when `resumeNodeId` set |
| Pagination | 25 per page; prev/next |
| a11y | Labeled search; tab `aria-selected`; link buttons min height |

## Handoff

**6E** — complete; see [LEARNING_6E_RESULTS.md](./LEARNING_6E_RESULTS.md).