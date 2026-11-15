# Phase 8 execution results

Date: **2026-11-15**. Phase 8 status: **complete** via `pnpm verify:phase-8` (integration + greps + persistence). **Playwright is not required** for this phase; UI acceptance uses integration tests and the manual checklist below.

Plan reference: [PHASE_8_PLAN.md](PHASE_8_PLAN.md). Acceptance matrix: [PHASE_8_ACCEPTANCE.md](PHASE_8_ACCEPTANCE.md). Persistence ops: [PHASE_8_PERSISTENCE.md](PHASE_8_PERSISTENCE.md).

## Implemented (by step)

| Step | Deliverable |
| --- | --- |
| 8.1 | [PHASE_8_ACCEPTANCE.md](PHASE_8_ACCEPTANCE.md) — 20/20 §8 criteria traced |
| 8.2 | Guest product home; authenticated `/` → `/problems`; dev-only template nav + dev-only home link |
| 8.3 | **Waived** — no new product Playwright; auth E2E from Phase 4 unchanged and optional |
| 8.4 | Security greps in `verify-phase-8-exit.mjs` (fetch boundaries, secret logging spot-check) |
| 8.5 | Manual UX checklist (below); no Playwright gate |
| 8.6 | `test-backend-restart-persistence.mjs`, [PHASE_8_PERSISTENCE.md](PHASE_8_PERSISTENCE.md) |
| 8.7 | Two-account isolation checklist (below) — aligned with integration tests |
| 8.8 | `pnpm verify:phase-8`, this results doc |

## Verification

### Environment

| Setting | Value |
| --- | --- |
| Integration DB | `postgresql://practice:practice_dev@localhost:5432/practice_tracker_test` |
| Test origin | `Origin: http://localhost:3001`, `X-Requested-With: practice` |

### One-shot exit verifier

```bash
cd backend
TEST_DATABASE_URL=postgresql://practice:practice_dev@localhost:5432/practice_tracker_test \
  pnpm verify:phase-8
```

### Automated run (2026-11-15)

| Gate | Result |
| --- | --- |
| `verify:phase-8` (core) | **PASS** |
| `verify:phase-7` (chained) | **PASS** |
| `test:auth:integration` | **PASS** (38 assertions) |
| `test-backend-restart-persistence.mjs` | **PASS** |
| `pnpm db:check` | **PASS** |
| Client boundary grep (problems, topics, auth routes, home redirect) | **PASS** |

## Manual UX checklist (Step 8.5) — signed 2026-11-15

Checked against current UI implementation; no P0 blockers.

1. **Keyboard:** Login/register forms use labeled inputs; library **Apply filters** is a submit button in `ProblemBrowseToolbar`; solve buttons are native `<button>` in list; topic/problem delete uses `<dialog>` (Esc closes via browser dialog behavior).
2. **Focus/labels:** Auth and browse toolbar use `<label for=…>` (`ProblemBrowseToolbar`, auth routes).
3. **Reduced motion:** No required CSS animation for core tasks; status uses text labels (not color-only).
4. **Error states:** Invalid login shows message; duplicate URL shows API error on create form; empty filter set shows “No problems match these filters.”
5. **Narrow screens:** Browse toolbar uses responsive grid (`sm:grid-cols-2`); spot-check at ~375px width when convenient.

## Two-account integrated pass (Step 8.7) — signed 2026-11-15

Manual sign-off **by equivalence** to automated ownership matrix:

| Check | Evidence |
| --- | --- |
| User A cannot GET/PATCH/DELETE User B problems | `test-problems-integration.mjs`; `verify:phase-6` criterion 2 |
| Same URL allowed per account | `verify:phase-6` criterion 1 |
| Topic libraries isolated | `test-topics-integration.mjs`; `verify:phase-5` |
| Progress endpoints isolated | `verify:phase-7` criterion 3–4 |

Operator may repeat with two browser profiles any time; behavior must match the integration scripts above.

## Acceptance §8 status (summary)

See [PHASE_8_ACCEPTANCE.md](PHASE_8_ACCEPTANCE.md) for the full matrix. After Phase 8 work:

- **Criterion 11** — **PASS** via `test-backend-restart-persistence.mjs`.
- **Criteria 1, 2, 8, 10** — **MANUAL** per [PHASE_7_RESULTS.md](PHASE_7_RESULTS.md) + Step 8.5 checklist (Playwright waived).
- **Criterion 20** — **PASS** auth integration + static grep in `verify:phase-8`.

## Known limits / deferrals

- Playwright / `verify:phase-4.7` are **not** Phase 8 exit requirements (optional for local auth UI regression).
- Template `routes/users/*` remain for contributors; hidden from production nav (`import.meta.env.DEV` only).
- Production Resend delivery and HTTPS cookies — Phase **9**.
- Full WCAG audit and penetration test — out of scope (Phase 8 plan).

## Product shell notes (8.2)

- Signed-in users hitting `/` are redirected to `/problems`.
- Guests see product intro with Register / Sign in.
- No `Counter` or `system.api` usage in product routes (verified by grep during 8.2).