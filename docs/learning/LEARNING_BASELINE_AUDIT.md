# Practice — Learning baseline audit

Status: Phase 0 closed 2026-11-27 (see PHASE_0_1_CLOSURE.md). Static audit complete; runtime baseline recorded in BASELINE_RUN with documented waivers. Scope: main branches of solve-tracker-backend and solve-tracker-frontend. No repository changes. This is not a comprehensive security audit or a test pass report.

## Executive decision
Retain the modular monolith, PostgreSQL, Drizzle, Zod, SolidJS and existing authentication/API contracts. Introduce a separate learning domain and evolve the shared product shell. Preserve all existing problem tracking semantics. Approved decisions: all independent learners; private guides first; visual block editor and Markdown import; required-step completion; best valid assessment score; dark mode at public release.

## Findings and remediation register
Priority reflects impact on learning integration, not proof of an existing vulnerability. B = https://github.com/shafayetullah7/solve-tracker-backend/blob/main/ ; F = https://github.com/shafayetullah7/solve-tracker-frontend/blob/main/ . Paths below are relative to these roots.

| ID | Priority | Evidence / observation | Action and phase | Acceptance |
|---|---|---|---|---|
| A01 | High | B: MEDIA_CONVENTIONS.md; src/modules/media/media-usage.ts. Two-slot usage count; acquisition rejects count >=2. | Phase 2 design explicit reference lifecycle; Phase 3 migrate with compatibility. Amend existing convention explicitly. | Multiple attachments, avatar/gallery behavior, detach, rollback and orphan cleanup tested. |
| A02 | High | B: src/modules/media/media-delivery.ts constructs standard Cloudinary upload URLs. Actual delivery permissions not verified. | Phase 2 establish private asset delivery policy; Phase 3 implement before uploads. | Unauthorized users cannot fetch private assets; verify direct URLs, cache and expiry. |
| A03 | High | B: src/modules/auth/access.guard.ts authenticates cookies; problems repository demonstrates owner-scoped queries. | Phase 2 define ownership invariants; Phase 3 enforce for every nested resource and import/export. | Cross-account read/write/move/attach/attempt requests rejected; no existence leakage. |
| A04 | High | B: src/modules/auth/auth-security.guard.ts checks origin/header, JSON body, special multipart media route. | Reuse guards; explicitly bound import size, depth, block count and request rate. Reuse media pipeline. Phase 2–3. | CSRF, malformed input, oversized payload and abuse tests. |
| A05 | High | F: config/node-csp.ts optional nonce CSP; no explicit frame-src, default self; HTTPS images allowed. | Phase 2 define safe block renderer, URL allowlist, sanitization, no arbitrary HTML/JS; verify CSP deployment and embeds. | XSS payloads inert; allowed resources work; external images privacy considered. |
| A06 | High | B: src/database/schema/problems/problems.table.ts unique user/normalized URL; src/modules/problems/problems.repository.ts owner filtering. | Phase 2 portable assignment identity; Phase 5 resolve to learner's library, preserve assignment when problem removed. | No duplicate library rows, no cross-user references, status changes reflected consistently. |
| A07 | High | B: src/modules/progress/progress.repository.ts aggregates solved problems and topic associations. | Separate learning progress service; Phase 2 define required-step denominator, parent own work and revision semantics; Phase 6 compose dashboard. | No double counting, optional work excluded, existing problem metrics unchanged. |
| A08 | Medium | F: src/components/app/AppShell.tsx fixed w-64 sidebar, h-dvh shell; AppPageContainer.tsx max-w-6xl. | Phase 1 focused workspace with compact global rail, collapsible tree, independent scrolling, mobile drawer. | Reading width usable at 768/1024/1440px; no clipped controls or keyboard traps. |
| A09 | Medium | F: src/components/app/AppSidebar.tsx and src/lib/app/nav-active.ts hardcoded navigation and active paths. | Phase 1 design navigation; Phase 6 update routing, create menu, active state and feature flags. | Existing deep links and mobile navigation work. |
| A10 | Medium | F: src/styles/theme.css light-only color scheme and semantic tokens. | Phase 1 define both themes; Phase 6 implement system/light/dark preference with SSR-safe initialization. | Contrast, focus, code blocks, diagrams and no theme flash verified. |
| A11 | Medium | F: src/routes/app/index.tsx loads coding progress before previews/activity. | Phase 6 independent learning/practice sections and errors, continue learning first where relevant. | Either domain can be empty or unavailable without blocking the other. |
| A12 | Medium | F: src/components/landing/landing-copy.ts positions product as coding tracker. | Phase 1 revise messaging; Phase 6 landing, metadata, onboarding and privacy copy. | Claims match actual functionality; manual solve status explicit. |
| A13 | Medium | F: package.json uses SolidJS 2 RC, router next, Tailwind 4.3.5. | Phase 2 prototype editor, tree drag/drop, SSR and serialization before dependency commitment. | Keyboard editing, paste, undo, IME, mobile and hydration work; no unnecessary framework upgrade. |
| A14 | Medium | B: BACKEND_CONVENTIONS.md, DRIZZLE_CONVENTIONS.md; F: package.json api:generate/api:check. | Phase 2 preserve Drizzle RC APIs, schema barrels, explicit Zod contracts and generated OpenAPI types. | Discriminated unions generate correctly; no contract drift; migration checks pass. |
| A15 | Medium | Existing Discover visibility is practice-oriented; guide publishing deferred. | Phase 2 isolate guide visibility and personal notes/attempts; Phase 7 privacy regression tests. | Existing public routes never expose private learning data. |

## Architecture baseline and regression inventory
Backend inventory contains migration folders for authentication, topics, problems, media/profile-era changes and Discover; unit tests for auth, problem completion, progress, media metadata/delivery, and Discover; integration scripts for auth, topics, problems, profile and Discover. Frontend inventory includes shell and navigation tests, API contract tests, auth coordination, and dashboard components. Browser automation was removed from the repo; manual screenshot and keyboard checks cover UI acceptance. Existing shell tests check focus trapping and active links. Broader WCAG conformance is unverified.

## Runtime baseline protocol (executed; see BASELINE_RUN)
Use clean checkouts of both repositories at recorded commit SHAs, sibling directories, documented Node/pnpm versions, isolated development database and test credentials. Never run destructive tests against production. Read README and test configuration before executing. Record commands, versions, exit codes, failures and artifacts.

Backend: pnpm install --frozen-lockfile; pnpm lint; pnpm test; pnpm build; pnpm db:check; pnpm api:check; pnpm api:types:check. With isolated DB: `pnpm test:e2e`; integration scripts under `scripts/` (see `scripts/README.md`), e.g. `pnpm build && node scripts/test-auth-integration.mjs`. Exercise Discover and media scripts according to their setup. Verify migration from empty database and upgrade of representative existing fixture; backup and restore rehearsal.

Frontend: pnpm install --frozen-lockfile; pnpm check; pnpm build; pnpm api:check; with backend on :3000 and dev or preview on :3001, `node scripts/verify-phase-4.7.mjs` and `node scripts/verify-ssr-2.mjs` as needed (from `solve-tracker-frontend`). Record actual browser screenshots of landing, login, dashboard, library, topics, profile and Discover at 390x844, 768x1024, 1024x768 and 1440x900. Check keyboard navigation, focus restoration, zoom, overflow, contrast, empty/error/loading states, slow network and mobile touch. Capture representative API latency and browser performance on small and large fixture libraries; do not invent performance baselines.

## Phase 0 exit gate
- [x] Approved product decisions documented in LEARNING_A0_RESULTS.md.
- [x] Requirements draft prepared in LEARNING_REQUIREMENTS.md.
- [x] Selected source-level integration risks recorded.
- [x] Pin audited commit SHAs and confirm repository state (`docs/learning/BASELINE_RUN.md`).
- [x] Execute runtime regression suite and record results (static gates + integration scripts; see `BASELINE_RUN.md`).
- [x] Capture and review real UI screenshots and accessibility baseline (**waived** — manual dev inspection; see `PHASE_0_1_CLOSURE.md`).
- [x] Complete authorization and media delivery runtime checks (**code review + auth integration**; delivery policy deferred to Phase 2–3).
- [x] Review requirements defaults and accept remaining risks (`PHASE_0_1_CLOSURE.md`, register A01–A15).

**Phase 0 formally closed.** Findings A01–A15 remain tracked remediation for later phases. Screenshots, full WCAG, dependency CVE scan, and backup/restore rehearsal are explicitly waived per closure document.