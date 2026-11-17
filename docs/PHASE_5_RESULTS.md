# Phase 5 execution results

Date: **2026-11-15**. Phase 5 status: **complete** — user-owned topics from PostgreSQL through typed client to protected UI. Step **5.5** verification matrix recorded below.

## Implemented

### Data and migration (Step 5.1)

- `topics` table: UUID `id`, `user_id` → `users.id` (`ON DELETE CASCADE`), `name`, `normalized_name`, timestamps.
- Unique index `topics_user_normalized_name_uniq` on (`user_id`, `normalized_name`).
- Migration folder: `drizzle/20261115065302_topics/migration.sql`.
- Drizzle schema under `src/database/schema/topics/`; relations registered in `relations.ts`.

### Backend API (Step 5.2)

- `TopicsModule`: `GET/POST /topics`, `PATCH/DELETE /topics/:topicId` behind `AuthSecurityGuard` + `AccessGuard`.
- Pagination `{ items, meta: { page, pageSize, total } }`; stable name sort.
- Errors: `VALIDATION_ERROR`, `NOT_FOUND` (missing or other-user id), `TOPIC_NAME_IN_USE` (409).
- OpenAPI: four `TopicsController_*` operations in `openapi.json`.

### Typed client (Step 5.3)

- `solve-tracker-frontend/src/lib/api/modules/topics.api.ts` + `topics.api.test.ts`; all operations use `recoverAuth: true`.
- `pnpm api:check` (backend) and `pnpm api:check` (frontend) pass.

### Topics management UI (Step 5.4)

- `solve-tracker-frontend/src/routes/topics.tsx`, `topics/index.tsx`, `lib/topics/messages.ts`.
- `AuthNav` promotes **Topics** before **Account** when authenticated.
- No raw `fetch` on the topics route (product calls via `createTopicsApi(auth.productClient)` only).

## Step 5.5 — Verification matrix

### Environment

| Setting | Value |
| --- | --- |
| Node | v26.13.0 (host run) |
| Integration DB | `postgresql://practice:practice_dev@localhost:5432/practice_tracker_test` |
| Test origin headers | `Origin: http://localhost:3001`, `X-Requested-With: practice` |

### Commands run

```bash
# Backend
cd solve-tracker-backend
pnpm lint
pnpm test                    # 43 unit tests
pnpm test:e2e                # 3 tests (mocked DB)
pnpm build
pnpm api:check
TEST_DATABASE_URL=postgresql://practice:practice_dev@localhost:5432/practice_tracker_test \
  pnpm test:auth:integration
TEST_DATABASE_URL=postgresql://practice:practice_dev@localhost:5432/practice_tracker_test \
  pnpm test:topics:integration

# Overall exit criteria (all seven gates; includes Phase 6 topic-delete retest)
cd solve-tracker-backend
TEST_DATABASE_URL=postgresql://practice:practice_dev@localhost:5432/practice_tracker_test \
  pnpm verify:phase-5

# Frontend
cd solve-tracker-frontend
pnpm exec tsc --noEmit
pnpm lint
pnpm test --run
pnpm api:check
pnpm build
```

### Automated evidence

| Gate | Result |
| --- | --- |
| Backend unit | **43 passed** |
| Backend e2e (mocked DB) | **3 passed** |
| Auth PostgreSQL/HTTP integration | **38 assertions** |
| Topics PostgreSQL/HTTP integration | **13 assertions** (`scripts/test-topics-integration.mjs`) |
| Phase 5 overall exit criteria | **`pnpm verify:phase-5`** — maps plan §exit criteria 1–7 |
| OpenAPI / generated types drift | **Pass** |
| Frontend unit | **93 passed** |
| Frontend production build | **Pass** (includes `/topics` routes) |

### Phase 5 exit criteria

| # | Criterion | Evidence |
| --- | --- | --- |
| 1 | Two accounts, independent libraries; same visible name across accounts | Integration: cross-user create **201**; B list excludes A’s id |
| 2 | Cross-account mutate by id → **404** | Integration: B cannot PATCH/DELETE A’s topic |
| 3 | Duplicate within account → **409** `TOPIC_NAME_IN_USE` | Integration: create + rename + concurrent race |
| 4 | Frontend uses `topics.api.ts` only | Code review; no `fetch` under `routes/topics` |
| 5 | Delete removes topic row; Phase 6 retest | Topics **204** + row gone; `verify:phase-5` runs problems topic-delete assertion |
| 6 | OpenAPI/types drift-clean | `api:check` both packages |
| 7 | Real PostgreSQL tests | `test-topics-integration.mjs` on dedicated `*_test` database |

### Example API samples (no secrets)

Authenticated requests require session cookies from `POST /auth/login` plus browser security headers.

```http
POST /topics
Content-Type: application/json

{"name":"Monotonic Stack"}
```

→ `201` — `{ "id": "<uuid>", "name": "Monotonic Stack", "createdAt": "…", "updatedAt": "…" }`

```http
POST /topics
{"name":"MONOTONIC STACK"}
```

→ `409` — `{ "code": "TOPIC_NAME_IN_USE", "message": "…" }`

```http
PATCH /topics/<other-users-uuid>
{"name":"Hijacked"}
```

→ `404` — `{ "code": "NOT_FOUND", "message": "…" }`

### Manual browser checklist (local dev stack)

| Step | Expected |
| --- | --- |
| Sign in | **Topics** in header |
| `/topics` | Load → empty or list; create/rename/delete; reload persists |
| Sign out | `/topics` gated via `RequireSession` |
| Two accounts | Same topic name allowed per account isolation |

Live Playwright coverage for topics is **not** added; auth E2E remains `verify:phase-4.7`.

### Completion checklist (plan §5.5)

- [x] `topics` schema, migration, and relations registered.
- [x] Four authenticated endpoints implemented and Swagger-documented.
- [x] Repository ownership checks on every mutating/query-by-id path.
- [x] `topics.api.ts` + tests; OpenAPI snapshot and `backend.d.ts` updated.
- [x] Protected topics UI with loading, empty, error, duplicate, and delete-confirm states.
- [x] Integration and ownership tests pass on a dedicated database.
- [x] `PHASE_5_RESULTS.md` written; execution plan status updated.

## Known limits and follow-ups

- **Docker packaging:** production image parity not re-verified in this step; host + local PostgreSQL used for integration.
- **Phase 4 gate:** `pnpm verify:phase-4.7` (Playwright) remains the separate live auth acceptance gate before release.
- **Phase 6 — re-verify topic delete:** done in Phase 6 — see [PHASE_6_RESULTS.md](PHASE_6_RESULTS.md) (`test-problems-integration.mjs`).

## Phase 6 handoff

Before closing Phase 6, repeat:

- Delete topic with associated problems → problems remain; associations removed.
- Problem create/edit may reference only topics owned by the same user.