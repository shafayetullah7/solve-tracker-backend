# Phase 8 — MVP acceptance traceability workbook (Step 8.1)

**Date:** 2026-11-15  
**Authority:** [backend/REQUIREMENTS.md §8](../backend/REQUIREMENTS.md) (MVP acceptance criteria 1–20)  
**Plan:** [PHASE_8_PLAN.md](PHASE_8_PLAN.md) Step 8.1 · [PROJECT_EXECUTION_PLAN.md](../PROJECT_EXECUTION_PLAN.md) Phase 8  

This workbook maps each §8 criterion to **concrete evidence**. Final PASS/FAIL for Phase 8 is recorded in `PHASE_8_RESULTS.md` (Step 8.8). Step 8.1 exit: **20/20 rows traced** with planned evidence; status may be `PASS`, `MANUAL`, or `GAP`.

**Integration DB:** `TEST_DATABASE_URL` must point at a database whose name ends in `_test` (e.g. `postgresql://practice:practice_dev@localhost:5432/practice_tracker_test`).

## Last verifier run (Step 8.1 audit)

| Command | Date | Result | Notes |
| --- | --- | --- | --- |
| `cd backend && TEST_DATABASE_URL=.../_test pnpm verify:phase-7` | 2026-11-15 | **PASS** | Chains lint/unit/e2e/build, problems integration, frontend gates, `verify:phase-5`, `verify:phase-6` |
| `pnpm verify:phase-6` | 2026-11-15 | **PASS** | Standalone confirmation |
| `pnpm verify:phase-5` | 2026-11-15 | **PASS** | Standalone confirmation |
| `pnpm test:auth:integration` | 2026-11-15 | **PASS** | 38 PostgreSQL/HTTP auth assertions |
| `cd backend && pnpm verify:phase-8` | 2026-11-15 | **PASS** | Core gate (no Playwright) |
| Playwright / `verify:phase-4.7` | — | **WAIVER** | Not required for Phase 8 exit |

## Evidence legend

| Type | Meaning |
| --- | --- |
| `integration` | Live PostgreSQL HTTP scripts under `backend/scripts/test-*-integration.mjs` |
| `unit` | Vitest in `backend` or `cp-frontend` |
| `Playwright` | `cp-frontend/e2e/*.spec.ts` (requires dev stack + browsers) |
| `verify-script` | `verify:phase-N` orchestrators |
| `manual` | Documented browser checklist (see [PHASE_7_RESULTS.md](PHASE_7_RESULTS.md) and Phase 8 Steps 8.5–8.7) |
| `static` | Code review / grep gates (Step 8.4) |

## MVP acceptance matrix (§8 criteria 1–20)

| # | Criterion (summary) | FR | Evidence type | Primary artifact | How to run / verify | Status | Phase 8 note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Save problem; find after reload | FR-01, FR-04 | integration, manual | `backend/scripts/test-problems-integration.mjs` — `Create links topics`, `Get by id`, `List includes owned problem` | `TEST_DATABASE_URL=... pnpm test:problems:integration` | **MANUAL** | Browser reload: [PHASE_7_RESULTS.md](PHASE_7_RESULTS.md) §manual checklist |
| 2 | Multi-topic in both topic views; once in library | FR-01, FR-02, FR-04 | integration, manual | Same script — `Create links topics` (2 `topicIds`); `List topicId filter` (one topic only) | Integration + manual: open each topic’s problem list in UI | **MANUAL** | Step **8.5** two-topic browse checklist |
| 3 | Solve/revert updates status and topic counts | FR-03, FR-05 | integration, manual | `test-problems-integration.mjs` — `Patch solved sets solvedAt`, `Revert clears solvedAt`, `Topic solved percent 100%`, `Revert restores unsolved topic counts` | `pnpm test:problems:integration`; UI: PHASE_7_RESULTS §manual (1) | **PASS** | UI re-check in Step **8.5** |
| 4 | One solved problem, three topics → overall 1 solved | FR-05 | integration, manual | `test-problems-integration.mjs` — `Progress overall total increases by one`, `Progress overall solved increases after solve` (3-topic matrix) | `pnpm verify:phase-7` (criterion 3); PHASE_7_RESULTS §manual (3) | **PASS** | — |
| 5 | Remove one topic association; others intact | FR-01, FR-02 | integration | `test-problems-integration.mjs` — `Patch title and replace topics` | `pnpm test:problems:integration` | **PASS** | — |
| 6 | Delete topic; problems stay in library | FR-02 | integration, verify-script | `test-problems-integration.mjs` — `Topic delete removes join; problem remains` | `pnpm verify:phase-6` criterion 5 | **PASS** | — |
| 7 | Duplicate URL rejected with useful message | FR-06 | integration | `test-problems-integration.mjs` — `Duplicate URL → 409`, `Patch URL to duplicate → 409` | `pnpm test:problems:integration` | **PASS** | — |
| 8 | Combined title search + platform + unsolved filter | FR-04 | integration, unit, manual | API: `Platform + status filter`, `Search q with topicIds any-match` (not one query with `q`+`platform`+`unsolved`); UI round-trip: `cp-frontend/src/lib/problems/browse-query.test.ts` | Integration partial; manual: PHASE_7_RESULTS §manual (2) | **MANUAL** | PHASE_7_RESULTS §manual (2) / Step **8.5** |
| 9 | Untagged create + untagged filter | FR-04 | integration | `test-problems-integration.mjs` — untagged POST + `Untagged filter includes orphan problem` | `pnpm test:problems:integration` | **PASS** | — |
| 10 | Failed save shows error; preserves input | FR-07, FR-01 | manual, unit | Forms: `cp-frontend/src/routes/problems/new.tsx`, `login.tsx`, `register.tsx` (field state not cleared on API error) | Manual: submit invalid problem/auth payloads; confirm fields retained | **MANUAL** | Step **8.5** usability checklist |
| 11 | Data after backend restart | FR-01–FR-05 | integration | `backend/scripts/test-backend-restart-persistence.mjs` | `pnpm test:persistence:integration` or `verify:phase-8` | **PASS** | Ops doc: [PHASE_8_PERSISTENCE.md](PHASE_8_PERSISTENCE.md) |
| 12 | Cross-user isolation (problems/topics) | FR-07 | integration, verify-script | Problems: cross-user PATCH → 404; `Same URL allowed across users`. Topics: `Independent topic libraries`, cross-user PATCH/DELETE → 404 | `pnpm verify:phase-5`, `verify:phase-6`, `verify:phase-7` | **PASS** | Two-account manual Step **8.7** |
| 13 | Register (name, email, password) + login | FR-07 | integration, Playwright | `test-auth-integration.mjs` — register/login/Argon2; E2E: `e2e/auth-flow.spec.ts` — `register, login, account, logout, and gate` | `pnpm test:auth:integration`; `pnpm verify:phase-4.7` when stack+browsers ready | **PASS** | Integration sufficient; Playwright waived for Phase 8 |
| 14 | Reset email via Resend; set new password | FR-08, FR-09 | integration, Playwright | `test-auth-integration.mjs` — `New password works`, mock `sent` capture; E2E: `e2e/reset-password.spec.ts` — `reset clears session and strips hash` | `pnpm test:auth:integration` | **PASS** | Production Resend delivery is Phase **9** |
| 15 | Invalid/expired/used reset token; old pwd fails, new works | FR-08 | integration | `Reset token consumed once concurrently`; expired reset → 400; `New password works` after reset | `pnpm test:auth:integration` | **PASS** | — |
| 16 | Forgot-password no enumeration | FR-08 | integration | `Forgot response does not enumerate accounts` | `pnpm test:auth:integration` | **PASS** | — |
| 17 | Distinct JWT access/refresh; wrong purpose rejected | FR-07 | integration | `Access authenticates`; `assert.rejects(auth.authenticate(first.tokens.refresh))`; expired session rejects access+refresh | `pnpm test:auth:integration` | **PASS** | Proxy/cookie path: `verify-phase-4.7-api.mjs` (live stack) |
| 18 | Refresh rotation, replay rejected; logout; reset revokes sessions | FR-07, FR-08 | integration, Playwright | `Concurrent refresh creates one successor`, `Other device unaffected by replay revocation`, `Logout wins against refresh`; reset revokes `recoverySession` | `pnpm test:auth:integration`; E2E `cross-tab.spec.ts` | **PASS** | HTTP integration covers rotation/logout; browser races optional |
| 19 | Same URL across two users independently | FR-06, FR-07 | integration | `test-problems-integration.mjs` — `Same URL allowed across users` | `pnpm verify:phase-6` criterion 1 | **PASS** | — |
| 20 | Argon2id; no secrets in API/logs | FR-07 | integration, static, Playwright | `Argon2id hashing`; `No JWT JSON payload`; Cookie HttpOnly; E2E `privacy.spec.ts` — `no jwt in document storage after login` | `pnpm test:auth:integration`; Step **8.4** grep gate | **MANUAL** | Step **8.4** repo scan for log/password leaks |

### Traceability summary

| Status | Count | Criterion # |
| --- | --- | --- |
| **PASS** | 14 | 3, 4, 5, 6, 7, 9, 11, 12, 13–19 |
| **MANUAL** | 6 | 1, 2, 8, 10, 20 (browser spot-check / PHASE_7 manual; Playwright waived) |
| **GAP** | 0 | — |

All **20** criteria have named evidence; none untraced.

## Appendix A — FR-01–FR-09 vs Phases 5–7 (gaps only)

| FR | Implemented (phases) | Primary surface | Automated gate | Gaps / notes |
| --- | --- | --- | --- | --- |
| FR-01 | 6–7 | `backend` problems module; `cp-frontend` `/problems/*` | `verify:phase-6`, `verify:phase-7` | §8.1: browser reload after save (**#1**). Notes multiline — not separately acceptance-tested. |
| FR-02 | 5–6 | Topics module; `/topics/*` | `verify:phase-5`, topic delete in problems integration | Topic delete UX confirmation copy — manual **8.5** only. |
| FR-03 | 7 | PATCH `status`, `solvedAt` rules | `verify:phase-7` criterion 1 | FR-03 “preserve timestamp on double solve” — integration + PHASE_7 manual. |
| FR-04 | 7 | List query, browse toolbar | `verify:phase-7` criterion 2 | §8 **#8** triple-filter combo not in single integration query; empty-state matrix — **8.5** manual. |
| FR-05 | 7 | `GET /progress`, strips | `verify:phase-7` criterion 3 | Filtered vs overall label — UI manual PHASE_7 §3. |
| FR-06 | 6 | URL normalize + 409 | problems integration | Concurrent race covered; canonical platform IDs deferred per REQUIREMENTS. |
| FR-07 | 4–7 | Auth module, proxy cookies | `test:auth:integration` | Rate limits partially HTTP-tested; Phase 4 Playwright optional. |
| FR-08 | 4 | Forgot/reset flows | `test:auth:integration` | Invalid reset-link UX — manual spot-check if desired. |
| FR-09 | 4 | Resend via backend mailer (mock in integration) | Auth integration uses in-memory `sent` | **No production Resend delivery proof** — Phase **9**; integration proves token/link generation and single-send semantics (`Email cooldown`). |

## Appendix B — Command index (auditors)

```bash
# Prerequisites
export TEST_DATABASE_URL=postgresql://practice:practice_dev@localhost:5432/practice_tracker_test

# Phase exit verifiers (backend)
cd backend
pnpm verify:phase-7    # superset: problems + progress + chains phase-5/6 + frontend gates
pnpm verify:phase-6
pnpm verify:phase-5

# Granular integration
pnpm test:problems:integration
pnpm test:topics:integration
pnpm test:auth:integration

# Optional — Phase 4 auth UI (not required for Phase 8 exit)
# cd ../cp-frontend && pnpm verify:phase-4.7
```

## Diagram (evidence flow)

```mermaid
flowchart LR
  REQ8[REQUIREMENTS_sec8] --> WB[PHASE_8_ACCEPTANCE_md]
  WB --> INT[backend_integration_scripts]
  WB --> E2E[cp_frontend_playwright]
  WB --> MAN[PHASE_7_8_manual_checklists]
  WB --> LAT[phase_8_later_steps]
```