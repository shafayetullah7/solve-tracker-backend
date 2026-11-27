# Learning — Phase 0 and Phase 1 closure

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides` (both repositories)  
**Status:** Formally closed with documented waivers.

## Pinned refs at closure

| Repository | SHA |
|------------|-----|
| solve-tracker-backend | `0f4234518f6be10d7fb4266954b1644597302f1c` |
| solve-tracker-frontend | `5a8aa1a7c9d35bca9a9e1f304698c689ac285483` |

See [BASELINE_RUN.md](./BASELINE_RUN.md) for recorded automated gates.

## Phase 0 — what was verified

- Product decisions A0-01–A0-06 ([LEARNING_A0_RESULTS.md](./LEARNING_A0_RESULTS.md)).
- Requirements draft ([LEARNING_REQUIREMENTS.md](./LEARNING_REQUIREMENTS.md)).
- Static audit and risk register A01–A15 ([LEARNING_BASELINE_AUDIT.md](./LEARNING_BASELINE_AUDIT.md)).
- Automated checks on test database: migrate, `test-topics-integration.mjs`, `test-learning-integration.mjs`; static lint/test/build/api checks (see BASELINE_RUN).
- Auth/media baseline: code review against `MEDIA_CONVENTIONS.md`, `access.guard`, and existing `test-auth-integration.mjs` coverage; no separate penetration test.

## Phase 0 — waivers (accepted risk)

- **Multi-viewport screenshot archive** — deferred; manual UI inspection during development replaces formal baseline index.
- **Full WCAG audit** — deferred to Phase 7 / pre-release; shell unit tests and conventions remain.
- **Dependency vulnerability scan** — not run as part of this closure; use normal dependency update process.
- **Backup/restore rehearsal** — deferred until production migration planning.
- **Browser E2E** — removed from repository; HTTP integration and smoke scripts replace Playwright.

## Phase 1 — what was delivered

- Information architecture and routes: [LEARNING_A1_UX_SPEC.md](./LEARNING_A1_UX_SPEC.md).
- Consolidated scope: [LEARNING_DESIGN_REVIEW.md](./LEARNING_DESIGN_REVIEW.md).
- Feature design specs under `solve-tracker-frontend/docs/learning/*_DESIGN.md`.
- **Approval:** R1 UX/navigation accepted as specified in markdown (no separate Figma/hi-fi package).
- **Waivers:** High-fidelity mockups and formal accessibility sign-off on every screen deferred; implementation (3A+) validates layout on real routes.

## Phase 1 — explicitly deferred to later phases

- Global Create menu and full dashboard reshape (Phase 6).
- Dark mode implementation (Phase 6; tokens sketched in SHELL_DASHBOARD_DESIGN).
- Editor, assessments, import flows (Phase 3–4 designs only).

## Sign-off

Phases 0 and 1 are **closed for purposes of continuing Phase 2+ implementation** on `feature/learning-guides`. Open findings A01–A15 remain implementation obligations in later phases, not blockers for this closure.