# Phase 8 — Integrated quality and security validation

Status: **complete** (automated `verify:phase-8` + documented manual sign-off). Results: [PHASE_8_RESULTS.md](PHASE_8_RESULTS.md). Traceability: [PHASE_8_ACCEPTANCE.md](PHASE_8_ACCEPTANCE.md). **Playwright not required** for Phase 8 exit.

Outcome: every [MVP acceptance criterion](../REQUIREMENTS.md) §8 is **traced to evidence** (automated gate, integration script, Playwright, or signed manual checklist); material gaps are **fixed** or **documented**; template/demo navigation no longer presents as product; a single **`pnpm verify:phase-8`** (plus live Playwright when enabled) demonstrates the integrated system on a dedicated `*_test` database and local dev stack.

References: [execution plan](../PROJECT_EXECUTION_PLAN.md), [requirements](../REQUIREMENTS.md) (§7–8, FR-01–FR-09), [Phase 7 results](PHASE_7_RESULTS.md), [Phase 7 plan](PHASE_7_PLAN.md), [Phase 4 results](PHASE_4_RESULTS.md), [Phase 6 results](PHASE_6_RESULTS.md), [backend conventions](../BACKEND_CONVENTIONS.md), [frontend conventions](../solve-tracker-frontend/FRONTEND_CONVENTIONS.md), [API client](../solve-tracker-frontend/API_CLIENT.md), [auth conventions](../solve-tracker-frontend/AUTH_CONVENTIONS.md).

## 1. Scope, prerequisites, and boundaries

### Prerequisites

- **Phase 7 complete:** `pnpm verify:phase-7` on `practice_tracker_test` (or equivalent `*_test` DB).
- **Phase 4 auth:** cookies, CSRF, refresh rotation, reset flow; `pnpm verify:phase-4.7` available when backend `:3000` and frontend `pnpm dev` `:3001` are running.
- **Local stack:** Docker PostgreSQL (or `TEST_DATABASE_URL`), backend, Vite proxy; Playwright Chromium installed once (`pnpm exec playwright install chromium` in `solve-tracker-frontend`).

### In scope

| Area | Phase 8 deliverable |
| --- | --- |
| **Acceptance** | Traceability matrix: REQUIREMENTS §8 items 1–20 → evidence + owner (auto / E2E / manual) |
| **Product shell** | Signed-in home experience; remove or hide template routes from primary nav (`Template examples`, scaffold homepage) |
| **E2E** | Playwright coverage for core product path (auth → problem → topics → solve/filter → progress labels), layered on existing auth E2E |
| **Security** | Re-run auth integration + Phase 4 API races; repo scan for raw `fetch` in `routes/`; no secrets in logs/responses (spot checks) |
| **UX quality** | Keyboard/focus/labels on auth + library toolbar; mobile viewport smoke; loading/empty/error states documented |
| **Persistence** | Fresh migrate + seed repeatability; restart survival (criterion 11) |
| **Verification** | `verify-phase-8-exit.mjs`, `PHASE_8_RESULTS.md`, execution plan status |

### Out of scope (Phase 9 or later)

- Production HTTPS, hosting, Resend production sender, backup/restore runbooks (Phase 9).
- New product features (CSV, goals, sharing, Playwright for every edge case).
- Full WCAG audit tooling; formal penetration test.
- Replacing Argon2 parameters or adding Redis/session stores.

```mermaid
flowchart TB
  subgraph automated [Automated gates]
    V7["verify:phase-7"]
    V8core["verify:phase-8 core"]
    AuthInt["test-auth-integration"]
    Int["problems/topics integration"]
  end
  subgraph live [Live stack optional]
    P47["verify:phase-4.7"]
    PW["Playwright e2e/"]
  end
  V8core --> V7
  V8core --> AuthInt
  V8core --> Int
  V8core --> P47
  P47 --> PW
```

## 2. MVP acceptance mapping (REQUIREMENTS §8)

Use this table in Step 8.1; extend with links to test files / checklist rows in `PHASE_8_RESULTS.md`.

| # | Criterion (summary) | Primary evidence (existing) | Phase 8 action |
| --- | --- | --- | --- |
| 1 | Save problem; survives reload | Phase 6 UI + integration create | E2E or manual reload check |
| 2 | Multi-topic appears in both topic views | Phase 6 associations | Manual / new E2E |
| 3 | Solve/revert updates topics + counts | Phase 7 completion + progress | E2E library + topics |
| 4 | One solved, three topics → overall 1 | Phase 7 progress integration + UI | Manual §7.7 matrix |
| 5 | Remove one topic association | PATCH topics replace | Integration (existing) |
| 6 | Delete topic; problems remain | Phase 5/6 integration | `verify:phase-5/6` |
| 7 | Duplicate URL rejected | Phase 6 integration 409 | Existing |
| 8 | Combined search + platform + unsolved | Phase 7 browse UI + API | E2E or manual |
| 9 | Untagged filter | Phase 7 list + integration | Integration (existing) |
| 10 | Failed save preserves input | Form UX (auth/problems) | Manual auth + problem forms |
| 11 | Data after backend restart | PostgreSQL persistence | Step 8.6 script or manual |
| 12 | Cross-user isolation | Auth + problems/topics integration | Existing two-account tests |
| 13 | Register + login (name, email, password) | Auth integration + E2E | `verify:phase-4.7` |
| 14–16 | Reset email, token rules, no enumeration | Auth integration + E2E reset | `test-auth-integration`, reset spec |
| 17–18 | JWT purpose, refresh rotation, logout | Auth integration + 4.7 API | Existing |
| 19 | Same URL across two users | Problems integration | Existing |
| 20 | Argon2, no secrets in API/logs | Auth + code review grep | Step 8.4 static checks |

**Pass for Phase 8:** every row has a **PASS** evidence cell or an explicit **documented limitation** in `PHASE_8_RESULTS.md`.

## Step 8.1 — Acceptance traceability workbook

### Work

- Create [`docs/PHASE_8_ACCEPTANCE.md`](PHASE_8_ACCEPTANCE.md) (or a section in `PHASE_8_RESULTS.md`): table above filled with command names, spec paths, and manual steps.
- Cross-check FR-01–FR-09 headers in [REQUIREMENTS.md](../REQUIREMENTS.md) against Phases 5–7; note any wording-only gaps.

### Exit criteria

- All 20 MVP rows marked planned evidence; no untraced criterion.

**Done (2026-11-15):** [PHASE_8_ACCEPTANCE.md](PHASE_8_ACCEPTANCE.md) — 20/20 traced (13 PASS, 6 MANUAL, 1 GAP → Step 8.6).

## Step 8.2 — Product shell and template cleanup

### Work

- **Home (`/`):** Authenticated users **redirect** to `/problems` (or account landing); guests see a short product intro + Sign in / Register—not the full UI foundation showcase as the default signed-in experience.
- **Navigation:** Remove **Template examples** from [`AuthNav.tsx`](../solve-tracker-frontend/src/components/auth/AuthNav.tsx) for production UX, or restrict to dev-only (`import.meta.env.DEV`) if routes stay for contributors.
- **Template routes:** Keep `routes/users/*` and foundation homepage **out of primary nav**; document in RESULTS if files remain for reference.
- **Counter / system API:** Confirm no product route depends on `Counter` or `system.api` for MVP flows.

### Exit criteria

- Signed-in user opening `/` lands on library (or documented intentional landing).
- No template link in default authenticated nav.

## Step 8.3 — Playwright product flows

**Waived (2026-11-15):** Phase 8 exit does not require new Playwright specs; see [PHASE_8_RESULTS.md](PHASE_8_RESULTS.md).

### Work

- Add **one or two** specs under [`solve-tracker-frontend/e2e/`](../solve-tracker-frontend/e2e/) (e.g. `product-library.spec.ts`):
  - Register or login (reuse [`fixtures.ts`](../solve-tracker-frontend/e2e/fixtures.ts) patterns).
  - Create problem with URL + two topics (or use API seed helper if added).
  - Mark solved from library; assert progress strip / topic row text (substring match).
  - Apply filter (unsolved + `q` or platform) and assert result count line updates.
- Mobile: one test at `375px` viewport for library toolbar + nav (smoke).
- Wire into **`verify:phase-8`** as optional stage when `PHASE_8_RUN_PLAYWRIGHT=1` and probe passes (mirror Phase 4.7).

### Exit criteria

- At least one green Playwright path covering auth + library + solve + filter on local stack.
- Failures produce artifacts under `e2e/playwright-report/`.

## Step 8.4 — Security and auth regression

### Work

- Re-run on `TEST_DATABASE_URL` `*_test`:
  - [`test-auth-integration.mjs`](../scripts/test-auth-integration.mjs)
  - [`verify-phase-4.7-api.mjs`](../solve-tracker-frontend/scripts/verify-phase-4.7-api.mjs) (with backend up) when live gate enabled
- Static checks in `verify-phase-8`:
  - No `\bfetch\s*\(` under `solve-tracker-frontend/src/routes/` (problems, topics, auth, account).
  - Grep for obvious secret leaks: `console.log` + password/token patterns in `src` (allowlist test mocks).
- Confirm CSRF header on writes still enforced (covered by 4.7 API script).

### Exit criteria

- Auth integration passes; client-boundary grep passes; no new high-severity findings without documented acceptance.

## Step 8.5 — Usability and accessibility pass

### Work

- Extend or re-run [`auth-a11y-smoke.spec.ts`](../solve-tracker-frontend/e2e/auth-a11y-smoke.spec.ts); add **library** smoke: tab to Apply filters, visible labels on browse toolbar (`ProblemBrowseToolbar`).
- Manual checklist in `PHASE_8_RESULTS.md`:
  - Keyboard: login, library filters, solve button, delete dialog (focus trap / Esc).
  - Reduced motion: no required animation for core tasks (document if `prefers-reduced-motion` unchanged).
  - Error states: invalid login, duplicate URL, filter with no matches.
- Narrow screens: browse toolbar wraps; pagination controls reachable.

### Exit criteria

- Checklist completed; critical blockers fixed; cosmetic issues listed as known limits.

## Step 8.6 — Database and persistence checks

### Work

- Document operator commands:
  - Fresh DB: `db:migrate` + `db:seed` on empty database.
  - Repeat migrate (idempotent) on existing DB.
- Add lightweight script or documented manual: create problem → **restart backend** (`docker compose` or `pnpm start:dev`) → GET problem still 200 (criterion 11).
- `verify:phase-8` includes `pnpm db:check` (Drizzle) when run from backend root.

### Exit criteria

- Migrate/seed steps documented; restart persistence verified once on test DB.

## Step 8.7 — Two-account integrated pass

### Work

- Manual (required): two browsers or profiles—User A problems/topics not visible to User B; same external URL allowed on both accounts; progress endpoints isolated.
- Optional: Playwright **second context** test mirroring problems integration ownership themes.

### Exit criteria

- Signed checklist in `PHASE_8_RESULTS.md`; matches integration ownership tests.

## Step 8.8 — Phase completion gate

### Work

- Add [`scripts/verify-phase-8-exit.mjs`](../scripts/verify-phase-8-exit.mjs) + `pnpm verify:phase-8` in [`package.json`](../package.json).
- Suggested gate order:
  1. `pnpm verify:phase-7` (regression umbrella)
  2. `pnpm test:auth:integration`
  3. Static client/security grep
  4. `pnpm db:check`
  5. If `PHASE_8_RUN_PLAYWRIGHT=1`: probe `:3001` + `verify-phase-4.7` or slim Playwright subset
- Write [`docs/PHASE_8_RESULTS.md`](PHASE_8_RESULTS.md): commands, Playwright list, manual checklist sign-off, known limits.
- Update [`PROJECT_EXECUTION_PLAN.md`](../PROJECT_EXECUTION_PLAN.md) Phase 8 status when exit criteria met.

### Phase 8 exit criteria (overall)

Automated target:

```bash
cd solve-tracker-backend
TEST_DATABASE_URL=postgresql://practice:practice_dev@localhost:5432/practice_tracker_test \
  pnpm verify:phase-8
```

With live browser gate (operator machine):

```bash
# terminals: backend :3000, solve-tracker-frontend pnpm dev :3001
cd solve-tracker-backend
TEST_DATABASE_URL=.../practice_tracker_test \
PHASE_8_RUN_PLAYWRIGHT=1 \
  pnpm verify:phase-8
```

1. **Regression:** Phase 7 verifier passes (feature baseline intact).
2. **Auth/security:** Auth integration + client route boundaries; no undocumented secret exposure.
3. **Acceptance:** All §8 criteria traced; gaps fixed or documented.
4. **Product shell:** Template nav removed from default UX; signed-in home sensible.
5. **E2E:** Core product Playwright green when live gate run (or explicit waiver in RESULTS with reason).
6. **Persistence:** Migrate/seed/restart story documented and spot-checked.
7. **Documentation:** `PHASE_8_RESULTS.md` + execution plan updated.

### Completion checklist

- [x] `PHASE_8_ACCEPTANCE.md` / acceptance table complete (20/20 traced).
- [x] Product shell cleanup (home redirect, nav).
- [x] Playwright product spec(s) — **waived** (not required; integration + manual).
- [x] Security/auth regression gates in `verify:phase-8`.
- [x] Usability/a11y manual checklist recorded.
- [x] Persistence / migrate documentation.
- [x] Two-account manual pass recorded.
- [x] `verify:phase-8` + `PHASE_8_RESULTS.md`; Phase 8 marked complete in execution plan.

## Relationship to Phase 9

Phase 9 owns **production** packaging, secrets, HTTPS, Resend production config, backups, and post-deploy smoke on the real environment. Phase 8 proves the **MVP logic and integrated dev/test stack**; Phase 9 proves **operational readiness**.

## Risks

| Risk | Mitigation |
| --- | --- |
| Playwright flakiness / CI without live stack | Optional `PHASE_8_RUN_PLAYWRIGHT`; document local-only gate like 4.7 |
| Acceptance matrix becomes stale | Link rows to script names; fail verify if trace file missing sections |
| Template removal breaks dev onboarding | Keep routes behind DEV-only nav or CONTRIBUTING note |
| Long verify runtime | `verify:phase-8` chains phase-7 once; skip duplicate integration where possible |

## Implementation order (recommended)

1. Step 8.1 traceability doc  
2. Step 8.2 product shell  
3. Step 8.4 security gates (script skeleton)  
4. Step 8.3 Playwright product spec  
5. Steps 8.5–8.7 manual checklists (parallel with 3–4)  
6. Step 8.8 `verify:phase-8` + RESULTS + execution plan  

**Next:** Execute **Step 8.1** after agreeing home redirect behavior (library vs dashboard with progress summary only).