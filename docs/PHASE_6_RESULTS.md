# Phase 6 execution results

Date: **2026-11-15**. Phase 6 status: **complete** — user-owned problem library from PostgreSQL through typed client to protected CRUD UI. Step **6.6** verification matrix recorded below.

## Implemented

### Data and migration (Step 6.1)

- Tables `problems`, `problem_topics` with ownership, normalized URL uniqueness per user, optional metadata, `status` + `solved_at`.
- Migration folder: `backend/drizzle/20261115094352_problems/migration.sql`.
- `problem-url.ts` (FR-06), `problem-title.ts`, `problem-fields.ts` + unit tests.

### Backend API (Step 6.2)

- `ProblemsModule`: `GET/POST /problems`, `GET/PATCH/DELETE /problems/:problemId` behind auth guards.
- Pagination and `topicId` filter; atomic topic association replace on PATCH.
- Errors: `VALIDATION_ERROR`, `NOT_FOUND`, `PROBLEM_URL_IN_USE` (409, optional `existingProblemId` in details).
- OpenAPI: five `ProblemsController_*` operations in `backend/openapi.json`.

### Typed client (Step 6.3)

- `cp-frontend/src/lib/api/modules/problems.api.ts` + `problems.api.test.ts`; `recoverAuth: true` on all ops.

### Library and CRUD UI (Steps 6.4–6.5)

- Routes: `/problems`, `/problems/new`, `/problems/:id`, `/problems/:id/edit` under `RequireSession`.
- `lib/problems/messages.ts`, `ProblemFormFields`, list filter `?topicId=`, delete confirm dialogs.
- `AuthNav` **Library** first; topic names link to filtered library.
- No raw `fetch` under `routes/problems` (product calls via `createProblemsApi` only).

## Step 6.6 — Verification matrix

### Environment

| Setting | Value |
| --- | --- |
| Node | host run (v26.x) |
| Integration DB | `postgresql://practice:practice_dev@localhost:5432/practice_tracker_test` |
| Test origin headers | `Origin: http://localhost:3001`, `X-Requested-With: practice` |

### Commands run

```bash
# Backend
cd backend
pnpm lint
pnpm test                    # 57 unit tests
pnpm test:e2e                # 3 tests (mocked DB)
pnpm build
pnpm api:check
TEST_DATABASE_URL=postgresql://practice:practice_dev@localhost:5432/practice_tracker_test \
  pnpm test:auth:integration
TEST_DATABASE_URL=postgresql://practice:practice_dev@localhost:5432/practice_tracker_test \
  pnpm test:topics:integration
TEST_DATABASE_URL=postgresql://practice:practice_dev@localhost:5432/practice_tracker_test \
  pnpm test:problems:integration

# Overall exit criteria (all nine gates)
cd backend
TEST_DATABASE_URL=postgresql://practice:practice_dev@localhost:5432/practice_tracker_test \
  pnpm verify:phase-6

# Frontend
cd cp-frontend
pnpm exec tsc --noEmit
pnpm lint
pnpm test --run
pnpm api:check
pnpm build
```

### Automated evidence

| Gate | Result |
| --- | --- |
| Backend unit | **57 passed** |
| Backend e2e (mocked DB) | **3 passed** |
| Problems PostgreSQL/HTTP integration | **20 assertions** (`scripts/test-problems-integration.mjs`) |
| Phase 6 overall exit criteria | **`pnpm verify:phase-6`** — maps plan §exit criteria 1–9 |
| Topics PostgreSQL/HTTP integration | **12 assertions** (Phase 5 suite; Phase 6 topic+problem delete in problems suite) |
| OpenAPI / generated types drift | **Pass** (`api:check` both packages) |
| Frontend unit | **105 passed** |
| Frontend production build | **Pass** (includes `/problems/*` routes) |

### Phase 6 exit criteria

| # | Criterion | Evidence |
| --- | --- | --- |
| 1 | Two accounts, independent libraries; same URL across accounts | Integration: user B **201** with A’s URL |
| 2 | Cross-account read/update/delete → **404** | Integration: GET/PATCH/DELETE as B |
| 3 | Duplicate URL within account → **409** create + patch | Integration: POST dup, concurrent race, PATCH url to dup |
| 4 | Topic assignment only to owned topics | Integration: foreign `topicIds` → **400** |
| 5 | Delete topic removes joins; problems remain | Integration: after topic delete, problem **200**, `topics: []` |
| 6 | Delete problem removes row and joins | Integration: SQL row count 0 after **204** |
| 7 | Frontend uses `problems.api.ts` only | Grep: no `fetch` in `routes/problems` |
| 8 | OpenAPI/types drift-clean | `api:check` |
| 9 | Real PostgreSQL tests | `test-problems-integration.mjs` on dedicated `*_test` database |

### Example API samples (no secrets)

Session cookies from `POST /auth/login` plus browser security headers required.

```http
POST /problems
Content-Type: application/json

{
  "title": "Two Sum",
  "url": "https://leetcode.com/problems/two-sum/",
  "topicIds": ["<owned-topic-uuid>"],
  "status": "unsolved"
}
```

→ `201` — problem body with `topics[]` summaries.

```http
POST /problems
{"title":"Dup","url":"https://leetcode.com/problems/two-sum/","topicIds":[]}
```

→ `409` — `{ "code": "PROBLEM_URL_IN_USE", "message": "…", "details": { "existingProblemId": "<uuid>" } }`

```http
DELETE /topics/<uuid>
```

With linked problems: **204** — topic row removed; problems still listable; associations cleared (verified in problems integration script).

### Manual browser checklist (local dev stack)

| Step | Expected |
| --- | --- |
| Sign in | **Library**, **Topics**, **Account** in header |
| `/problems` | Load list; **Add problem**; Open/View/Edit/Delete |
| `/problems/new` | Create with topics + “Already solved”; lands on detail |
| Duplicate URL | Form values kept; message + link to existing problem when id returned |
| `/topics` | Topic name → `/problems?topicId=` filter |
| `/problems/:id` | Read-only fields; edit and delete |
| Sign out | `/problems` gated via `RequireSession` |

Live Playwright coverage for problems is **not** added in Phase 6; auth E2E remains `verify:phase-4.7`.

### Completion checklist (plan §6.6)

- [x] `problems` + `problem_topics` schema, migration, relations registered.
- [x] URL normalization module + unit tests; FR-06 rules documented in code.
- [x] Five authenticated endpoints implemented and Swagger-documented.
- [x] Repository ownership and topic-ownership checks on all paths.
- [x] `problems.api.ts` + tests; OpenAPI snapshot and `backend.d.ts` updated.
- [x] Protected library, create, edit, detail, delete-confirm UI.
- [x] Topic-scoped list filter wired (`?topicId=`).
- [x] Integration tests pass on dedicated database; topic-delete retest in problems suite.
- [x] `PHASE_6_RESULTS.md` written; execution plan status updated.

## Known limits and follow-ups

- **Phase 7:** solve/revert on detail, search, combined filters, progress summaries (see [PHASE_6_PLAN.md](PHASE_6_PLAN.md)).
- **Pagination:** library and topic pickers use `pageSize: 100` with truncation notes.
- **Docker packaging:** host + local PostgreSQL used for integration evidence in this step.
- **Browser automation:** no new Playwright suite for problems; manual checklist above.

## Phase 7 handoff

Before closing Phase 7, re-verify:

- Mark solved / revert updates `solved_at` and list display.
- Progress counts count each problem once overall while topic views use association sets.