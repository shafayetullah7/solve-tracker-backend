# Phase 5 — User-owned topics execution plan

Status: **complete (2026-11-15).** See [PHASE_5_RESULTS.md](PHASE_5_RESULTS.md) for verification evidence, integration script, and Phase 6 delete retest note.

Outcome: an authenticated user can create, list, rename, and delete their own topics through the real API and a protected frontend screen. Topic names are unique per account (trimmed, case-insensitive). Cross-account access and duplicate names fail safely. OpenAPI and the shared typed client stay aligned. Problem records, associations, and progress UI remain Phase 6.

References: [execution plan](../PROJECT_EXECUTION_PLAN.md), [requirements](../REQUIREMENTS.md) (FR-02), [Phase 0 decisions](PHASE_0_DECISIONS.md), [Phase 3 results](PHASE_3_RESULTS.md), [Phase 4 plan](PHASE_4_PLAN.md), [backend conventions](../BACKEND_CONVENTIONS.md), [Drizzle conventions](../DRIZZLE_CONVENTIONS.md), [frontend conventions](../solve-tracker-frontend/FRONTEND_CONVENTIONS.md), [API client](../solve-tracker-frontend/API_CLIENT.md).

## 1. Scope, prerequisites, and boundaries

### Prerequisites

- **Phase 3:** `AccessGuard`, authenticated identity on requests, established error shape and Zod/Swagger patterns.
- **Phase 4:** working login/session, `RequireSession`, recovery-enabled `createApiClient` for product calls, protected route pattern. Backend-only work can start earlier; **end-to-end completion requires Phase 4**.
- **Phase 2:** transport, OpenAPI export/generation, `recoverAuth` on product operations.
- **Database:** apply the new topics migration only to a known-safe development or test database after inspection (same rule as earlier phases). Real PostgreSQL integration tests are required for uniqueness and ownership gates.

### In scope

- `topics` table, migration, and relation to `users`.
- Authenticated **create, list, rename (patch name), delete** HTTP APIs with documented contracts.
- `topics.api.ts` on the frontend and a **topics management UI** (list, create inline or dialog, rename, delete with confirmation).
- Loading, empty, validation, duplicate-name, not-found, and unavailable states.
- Ownership isolation: two accounts with the same visible topic name; account A cannot read or mutate account B’s topic by ID.
- **Delete semantics for Phase 5:** remove the topic row only. No `problem_topics` table yet—document that Phase 6 must attach associations with `ON DELETE CASCADE` (or equivalent service logic) so topic deletion removes links but never problems.

### Out of scope (defer)

- Problem CRUD, `problem_topics`, completion, search, filters, progress summaries (Phases 6–7).
- Topic detail view with a problem list (empty “no problems yet” copy may appear only if a route shell is introduced in Phase 6; Phase 5 focuses on **management**, not a fake library).
- CSV import, sharing, sheets/collections, bulk topic operations.
- SSR, BFF, Redis, new query libraries, or raw `fetch` in components.

## 2. Intended organization

```text
src/
  database/schema/
    topics/
      topics.table.ts
      topics.relations.ts
      index.ts
    relations.ts                 # register topics + user relation
  modules/topics/
    topics.module.ts
    topics.controller.ts
    topics.service.ts
    topics.repository.ts
    schemas/
      topics.schema.ts             # Zod + Swagger response schemas

solve-tracker-frontend/src/
  lib/api/modules/
    topics.api.ts
    topics.api.test.ts
  components/topics/               # only if shared UI is reused twice+
    TopicList.tsx                  # optional extraction
  routes/
    topics.tsx                     # layout + RequireSession
    topics/index.tsx               # management screen (or single route file)
```

Follow existing Nest module layout (`auth/`). Register `TopicsModule` in `AppModule`. Use plural resource path `topics` under the global API prefix (browser: `/api/topics`).

## Step 5.1 — Data model and migration contract

### Work

- Add `topics` with at least: UUID primary key, `user_id` FK → `users.id` (cascade on user delete is acceptable for MVP privacy), display `name`, persisted `normalized_name`, `created_at` / `updated_at` (timestamptz).
- Enforce **unique (`user_id`, `normalized_name`)** in PostgreSQL, not only in application code.
- **Normalization:** trim leading/trailing whitespace on `name`; reject empty after trim. Compute `normalized_name` with a single documented rule (recommended: Unicode case-fold or lowercase per locale-invariant product rule + trimmed `name`) so `Monotonic Stack` and `monotonic stack` conflict for the same owner.
- **Length:** define symmetric server limits before implementation (recommended: 1–100 Unicode code points for `name`, matching registration name discipline in Phase 0). Validate with the same code-point counting approach as auth, not UTF-16 `.length` alone.
- Register relations in the Drizzle v2 registry; export through domain and root barrels per `DRIZZLE_CONVENTIONS.md`.
- Generate and review a new migration; do not alter or squash the existing platform or auth migrations.
- **Do not** add `problems` or `problem_topics` in this step unless required as empty placeholders—prefer a Phase 6 migration for join tables.

### Exit criteria

- Migration applies cleanly on a dedicated test database.
- Integration test proves: duplicate normalized name for the same user fails (409); same display name for two users succeeds; FK rejects invalid `user_id`.
- `pnpm db:check` (or project equivalent) passes with the new snapshot.

**Pass:** schema and constraints match FR-02 persistence rules; migration is committed and reviewed.

## Step 5.2 — Backend topics API

### Work

- Implement `TopicsModule` with controller, service, repository. Every handler uses `AccessGuard`; identity from `req.auth` only—never a body/query `userId`.
- Endpoints (align with [backend conventions](../BACKEND_CONVENTIONS.md)):

  | Method | Path | Purpose |
  | --- | --- | --- |
  | `GET` | `/topics` | Paginated list for authenticated owner |
  | `POST` | `/topics` | Create `{ name }` |
  | `PATCH` | `/topics/:topicId` | Rename `{ name }` |
  | `DELETE` | `/topics/:topicId` | Delete owned topic |

- List: `{ items, meta: { page, pageSize, total } }`; defaults `page=1`, `pageSize=25`, max `100`; stable sort (e.g. `name` ascending, tie-breaker `id`).
- Success: `201` + topic body on create; `200` + topic body on patch; `204` on delete; public fields only (`id`, `name`, `createdAt`, `updatedAt`)—no `normalizedName`, no `userId` in JSON unless product explicitly requires it (default: omit owner id).
- Errors: `400 VALIDATION_ERROR` with safe field details; `404 NOT_FOUND` when id missing or not owned (do not distinguish cross-tenant existence); `409 TOPIC_NAME_IN_USE` (or consistent code) on unique violation; standard auth errors unchanged.
- Map PostgreSQL unique violations to 409 via constraint identity, not message string matching.
- Update `updated_at` on writes in the service/repository layer.
- Swagger: tag `Topics`, Zod schemas on inputs, explicit response schemas; run OpenAPI export and commit snapshot when contracts are stable.

### Exit criteria

- HTTP + PostgreSQL integration tests: CRUD happy path, validation boundaries, duplicate rename/create, cross-user ID access → 404, list pagination totals, concurrent duplicate create → one success and one 409.
- Unit tests for normalization/validation edge cases (trim, case collision, code-point limits).
- `pnpm build`, `pnpm lint`, `pnpm test`, and real DB integration suite pass.

**Pass:** backend alone satisfies FR-02 API slice and ownership rules without problems.

## Step 5.3 — Typed client and contract drift

### Work

- Add `createTopicsApi(client)` with `recoverAuth: true` on all operations (session-protected product API).
- Narrow JSON responses like `auth.api.ts`; export input/output types from generated `operations` where available.
- Paths: `/topics`, `/topics/{topicId}` with validated id strings; no encoded path segments beyond agreed rules in `API_CLIENT.md`.
- Add focused transport tests for list pagination query encoding and error code mapping (`TOPIC_NAME_IN_USE`, `NOT_FOUND`).
- From repo root (`solve-tracker-backend/`): `pnpm api:export` and `pnpm api:check`. From `solve-tracker-frontend/`: `pnpm api:generate` and `pnpm api:check`. Commit snapshot and generated types together.

### Exit criteria

- Generated types include all four topic operations; drift checks pass in CI/local scripts.
- `topics.api.test.ts` covers success decoding and contract failures without hitting a live server.

**Pass:** frontend can call topics only through the shared client module with recovery enabled.

## Step 5.4 — Topics management UI

### Work

- Add a **protected** route (e.g. `/topics`) wrapped with `RequireSession` (from Phase 4). Link from the app nav as the first real product destination; keep or demote template demo routes without implying fake data.
- Screen behavior:
  - **Loading:** full-page or in-panel pending state while list loads; no flash of empty before first fetch completes.
  - **Empty:** clear copy inviting the user to create their first topic.
  - **List:** show topic names; actions for rename and delete.
  - **Create:** single-field name with label, validation hints (length, uniqueness message from server).
  - **Rename:** inline or small form; preserve user input on failure.
  - **Delete:** confirmation dialog explaining problems are **not** deleted (wording accurate for Phase 5—no problems exist yet; keep language aligned with requirements for Phase 6).
- Use `Button`, `Panel`, `.ui-field`, and existing typography/spacing tokens. No raw `fetch`.
- Data loading: use installed Solid 2 patterns from frontend conventions (`Loading` / `Errored` / `createAsync` or equivalent memo)—one list fetch on mount, refetch after successful mutations; do not refresh the auth session as part of topic writes.
- Handle `ApiError` kinds: show field errors, generic duplicate message, unavailable/retry for network/5xx, respect `RATE_LIMITED` if limits are later shared with product routes.
- Accessibility: labeled inputs, `aria-invalid`, keyboard submit, focus management on dialogs/errors, mobile layout without horizontal scroll.

### Exit criteria

- Manual or automated browser check: logged-in user creates two topics, renames one, deletes one, reloads and sees consistent data.
- Duplicate name shows server-driven error without clearing the typed name (except where UX intentionally resets).
- Logged-out user cannot reach the screen (redirect or gate). Two test accounts verify isolation in the browser when Phase 4 multi-account setup exists.

**Pass:** FR-02 management UX is usable end-to-end through proxy + cookies.

## Step 5.5 — Verification, documentation, and phase completion

### Work

- Run full frontend and backend verification matrices relevant to this phase (build, typecheck, lint, unit, HTTP, PostgreSQL integration).
- Add `docs/PHASE_5_RESULTS.md` with: files touched, commands run, migration name, example API samples (no secrets), browser evidence, and known limits (Docker packaging, Phase 6 association delete retest).
- Update `PROJECT_EXECUTION_PLAN.md` Phase 5 status only when exit criteria below are met—not when APIs exist without UI or without ownership tests.
- Optionally extend README navigation for “Topics” once the route is real.

### Phase 5 exit criteria (overall)

Automated run: `cd solve-tracker-backend && TEST_DATABASE_URL=…/practice_tracker_test pnpm verify:phase-5` (includes Phase 6 topic-delete retest by default; set `VERIFY_PHASE6_TOPIC_DELETE=0` to skip). See [PHASE_5_RESULTS.md](PHASE_5_RESULTS.md).

From the execution plan, plus concrete evidence:

1. **Two accounts** each maintain independent topic libraries; identical names across accounts are allowed.
2. **Cross-account** read/update/delete by topic id returns **404** (or equivalent safe not-found) without leaking ownership.
3. **Duplicate** name within one account returns **409** with a useful, safe message on create and rename.
4. **Frontend** uses `topics.api.ts` and the recovery-enabled client only; no product-level raw `fetch`.
5. **Delete** removes the topic for the owner; Phase 6 checklist item recorded: re-verify delete when `problem_topics` exists (associations drop, problems remain).
6. **OpenAPI/generated types** committed and drift-clean.
7. **Real PostgreSQL tests** cover uniqueness and ownership; mocked-only evidence is not sufficient to mark the phase complete.

### Completion checklist

- [x] `topics` schema, migration, and relations registered.
- [x] Four authenticated endpoints implemented and Swagger-documented.
- [x] Repository ownership checks on every mutating/query-by-id path.
- [x] `topics.api.ts` + tests; OpenAPI snapshot and `backend.d.ts` updated.
- [x] Protected topics UI with loading, empty, error, duplicate, and delete-confirm states.
- [x] Integration and ownership tests pass on a dedicated database.
- [x] `PHASE_5_RESULTS.md` written; execution plan status updated if all exit criteria met.

If PostgreSQL or Phase 4 browser prerequisites cannot run, record the exact blocker and leave Phase 5 **incomplete** rather than marking partial API-only work as done.

## Relationship to Phase 6

Phase 6 introduces `problems` and `problem_topics`. Before closing Phase 6, re-run:

- Delete topic with associated problems → problems remain in library; join rows removed.
- Assign only topics owned by the same user on problem create/edit.

Phase 5 should choose topic **primary keys (UUID)** and **delete behavior** compatible with that join migration without renaming public API ids later.