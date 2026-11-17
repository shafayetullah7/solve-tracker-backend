# Project execution plan

This plan defines the order for completing the coding practice tracker MVP. Phases are sequential unless a task explicitly has no dependency on earlier work. Each phase must meet its exit criteria before dependent work proceeds. This document is a plan, not authorization to deploy, send emails, reset databases, or add optional features.

## References and current position

- [Product requirements](backend/REQUIREMENTS.md)
- [Backend conventions](backend/BACKEND_CONVENTIONS.md)
- [Drizzle conventions](backend/DRIZZLE_CONVENTIONS.md)
- [Frontend conventions and UI scheme](solve-tracker-frontend/FRONTEND_CONVENTIONS.md)
- [Authentication and refresh conventions](solve-tracker-frontend/AUTH_CONVENTIONS.md)
- [Media, gallery, and profile photo conventions](MEDIA_CONVENTIONS.md)

Repository foundations already exist: NestJS, PostgreSQL development Compose, environment validation, Swagger setup, Drizzle ORM/Kit 1.0.0-rc.5, pnpm scripts, Solid 2 Vite Start-mode CSR, Tailwind 4, UI primitives, and conventions. A platform schema/migration and seed exist. Product features and authentication are not complete. Live Docker/PostgreSQL verification was previously blocked by Docker access; it remains a verification task, not a passed check.

Do not repeat the scaffold setup or replace the selected frameworks. Review the current files before starting each phase; mark progress only when implementation and relevant checks actually pass.

## Phase overview

| Order | Phase | Outcome |
| --- | --- | --- |
| 0 | Resolve MVP decisions | Agreed behavior and auth configuration |
| 1 | Verify infrastructure | Reproducible local development and database workflow |
| 2 | Establish API contracts and shared client | One typed networking boundary for the frontend |
| 3 | Implement backend authentication | Secure accounts, JWT sessions, and password recovery |
| 4 | Implement frontend authentication | Working auth screens and coordinated session recovery |
| 5 | Implement user-owned topics | First complete authenticated feature |
| 6 | Implement the problem library | User-owned problem CRUD and topic associations |
| 7 | Implement completion and discovery | Solving workflow, filtering, sorting, and progress |
| 8 | Validate the integrated MVP | Reliable behavior across browsers, users, and failures |
| 9 | Prepare and release | Verified production operation and handoff |

## Phase 0 — Resolve MVP decisions

**Status: planning complete (2026-11-10).** Execution selected the policies in [PHASE_0_DECISIONS.md](docs/PHASE_0_DECISIONS.md). [PHASE_0_PLAN.md](docs/PHASE_0_PLAN.md) retains the original steps and completion checklist. Real sender/domain, production hosting, and runtime benchmarks are tracked release dependencies; no authentication code or external side effects were performed.

### Work

- Confirm remaining product choices: topic tags without separate sheets, manual entry without CSV import, and automatic solve timestamps unless historical dates are explicitly required. These are current planning defaults, not newly confirmed preferences.
- Select password policy, Argon2id parameters, JWT signing algorithm/key management, access/refresh lifetimes, and reset-token lifetime.
- Confirm the documented immediate session-revocation behavior. If choosing simpler stateless access JWTs instead, explicitly accept and document their validity until expiry after logout/reset.
- Confirm email verification scope; it is not currently required for the MVP.
- Identify Resend sender identity and the trusted frontend password-reset URL. Use mocked email delivery in routine tests.
- Choose intended production hosting/origin topology early enough to validate same-origin `/api` proxying, cookies, and HTTPS. Actual release is Phase 9.
- Keep CSR for the private tracker. Do not introduce SSR, BFF, workers, Redis, or a second auth framework without a concrete requirement.

### Exit criteria

The affected decisions are recorded in the requirements or a short decision record. Unresolved details block only their dependent tasks; independent preparation may continue.

## Phase 1 — Verify existing infrastructure

**Status: partially verified; live Docker/PostgreSQL verification blocked (2026-11-10).** See [PHASE_1_RESULTS.md](docs/PHASE_1_RESULTS.md) for passed Node 24 checks, browser/HMR verification, and exact remaining work. Follow [PHASE_1_PLAN.md](docs/PHASE_1_PLAN.md) from the database-state inspection step once OS Docker access is restored. Phase 1 is not complete.

### Work

- Verify the documented Node/pnpm versions, frozen lockfile installs, environment examples, and application startup validation.
- Resolve local Docker access and run the backend plus PostgreSQL through Compose with watch mode.
- Verify source changes trigger reload, the database health dependency works, and data survives normal stop/start.
- Inspect the target database and migration history before applying the regenerated initial platform migration. Do not reset volumes or silently baseline an existing table.
- Run migrations and seeds against an appropriate development/test database; repeat to verify normal reruns do not duplicate records.
- Verify host commands against an externally configured database URL as well as container commands inside the running backend.
- Confirm the frontend starts on port 3001, the backend on its configured port, and the theme/build setup works.

### Exit criteria

A developer can follow the READMEs to start both applications, apply migrations, seed, and observe watch-mode changes. Record any environment-specific blocker accurately.

## Phase 2 — Establish API contracts and the shared frontend client

**Status: independent client foundation complete (2026-11-10).** See [PHASE_2_RESULTS.md](docs/PHASE_2_RESULTS.md) for implemented transport/proxy, generated real-route types, 65 passing tests across both projects, and deferred live integration. Phase 1 Docker/PostgreSQL and Phase 3–4 authentication gates remain open. [PHASE_2_PLAN.md](docs/PHASE_2_PLAN.md) retains the execution checklist.

### Work

- Define consistent endpoint paths, safe response shapes, pagination, validation errors, and machine-readable authentication error codes.
- Implement the same-origin development `/api` proxy with an environment-configured upstream. Document the corresponding production routing requirement.
- Create one frontend transport in `src/lib/api/` for base paths, credentials, JSON handling, typed errors, cancellation, and bounded auth-recovery integration.
- Keep the auth transport's refresh call separate from the recovery-enabled wrapper to avoid recursion.
- Define backend APIs through typed feature modules such as `auth.api.ts`, `topics.api.ts`, and `problems.api.ts`. Add each operation when its backend contract exists; do not invent the entire API up front.
- Prefer generated OpenAPI request/response types, with a reproducible generation command and documented output location. Complete the first generation as the first real endpoint schemas land; do not build a custom generator framework.
- Components/routes must call these API functions rather than raw fetch. Keep fetch confined to the transport/auth transport and explicit tests.
- Ensure API functions accept cancellation where relevant and remain ordinary reusable TypeScript. Compose them with installed Solid 2 reactive primitives rather than embedding framework state into the transport.
- Record these boundaries in the frontend conventions so later features follow them.

### Exit criteria

The transport and feature-module pattern are established and tested for representative success/error/cancellation behavior. Its recovery interface is ready for Phases 3–4. OpenAPI-derived types reflect available endpoints rather than speculative functionality.

## Phase 3 — Implement backend accounts and authentication

**Status: implemented and locally verified (2026-11-10).** See [PHASE_3_RESULTS.md](docs/PHASE_3_RESULTS.md): real PostgreSQL authentication/concurrency checks passed using an isolated native test cluster, alongside backend/frontend checks and generated contracts. Docker image validation and production email/deployment gates remain open; Phase 1 is not complete. [PHASE_3_PLAN.md](docs/PHASE_3_PLAN.md) retains the execution checklist.

### Work

- Add User, AuthSession, and PasswordResetToken schemas under domain folders in the shared schema root. Export through barrels and register relations using the pinned Drizzle APIs.
- Generate/review/apply migrations. Enforce unique normalized emails and necessary session/token constraints.
- Implement registration with name, email, and password only; hash and verify passwords using Argon2id.
- Implement login, read-only session inspection, refresh, and logout. Issue purpose-separated JWT access/refresh credentials through the documented HttpOnly cookies.
- Implement atomic refresh rotation, digest-only credential persistence, replay detection, and server-side revocation consistent with the requirements.
- Protect unsafe endpoints using the agreed same-origin Origin/custom-header policy. Add rate limits and safe validation/credential errors.
- Add Resend integration and forgot/reset-password endpoints with trusted reset URLs, expiring single-use hashed tokens, atomic consumption, and account-session invalidation.
- Validate new environment variables with Zod and update `.env.example`, Compose mappings where needed, README, and Swagger contracts.
- Ensure protected operations derive user identity from verified authentication, not request-body owner IDs.

### Exit criteria

Backend tests cover registration/login, duplicate accounts, expiry, wrong token purpose, concurrent rotation/replay, logout, reset-token expiry/reuse, and Resend failure handling. Real PostgreSQL tests verify atomicity and persistent constraints. Secrets are absent from logs and public response bodies. Auth OpenAPI types are available to the frontend.

## Phase 4 — Implement frontend auth and refresh coordination

**Status: implemented; live browser gate open.** See [PHASE_4_RESULTS.md](docs/PHASE_4_RESULTS.md) and [PHASE_4_PLAN.md](docs/PHASE_4_PLAN.md). Auth provider, screens, `RequireSession`, coordinator, and cross-tab hints are in `solve-tracker-frontend`. Run `pnpm verify:phase-4.7` with backend and `pnpm dev` before release sign-off.

### Work

- Build registration, login, forgot-password, and reset-password screens with the established UI primitives and accessible validation feedback.
- Implement the root auth provider with checking/authenticated/anonymous/unavailable states; bootstrap once using the installed Solid 2 lifecycle pattern.
- Implement the shared recovery promise, origin-wide Web Lock, and read-only session recheck after lock acquisition. Keep refresh out of components.
- Retry eligible requests at most once. Do not refresh for ordinary permission failures, credential-form errors, or arbitrary network failures.
- Coordinate session-changing actions, late responses, logout, cache clearing, and account changes through the documented auth epoch/locking policy.
- Add safe cross-tab invalidation notifications without token payloads. Handle unsupported Web Locks and ambiguous refresh delivery explicitly.
- Keep JWTs inaccessible to frontend JavaScript. Validate actual cookie/proxy behavior in a browser, not only unit mocks.
- Use the shared typed `auth.api.ts` functions throughout. Use Solid 2 control flow for session states; do not copy React/Next or Solid 1.x auth examples.

### Exit criteria

A user can register, log in, reload, recover an expired session, log out, and reset their password. Multi-request and multi-tab tests verify no duplicate rotation after a successful recovery and no stale-account restoration. Protected content does not flash before session resolution.

## Phase 5 — Implement user-owned topics end to end

**Status: complete (2026-11-15).** See [PHASE_5_RESULTS.md](docs/PHASE_5_RESULTS.md). Topics schema/migration, four authenticated endpoints, `topics.api.ts`, protected `/topics` UI, and PostgreSQL ownership/uniqueness integration (`pnpm test:topics:integration` on a dedicated `*_test` database) are implemented and verified. Phase 4 Playwright gate (`verify:phase-4.7`) remains a separate release prerequisite.

### Work

- Add the Topic schema, owner reference, normalized-name uniqueness per user, and relevant relations/migrations.
- Implement authenticated create/list/rename/delete APIs with Zod schemas and documented responses.
- Add the typed topic API module and build topic management UI.
- Include loading, empty, error, duplicate-name, and deletion-confirmation states.
- Test identical topic names across different users and rejected access to another user's topic.
- Design deletion to preserve problems; verify associations when they are introduced in Phase 6.

### Exit criteria

Two accounts can independently manage private topics, and cross-user operations fail. Frontend calls are typed and reuse the shared client.

## Phase 6 — Implement the user-owned problem library

**Status: complete (2026-11-15).** Evidence in [PHASE_6_RESULTS.md](docs/PHASE_6_RESULTS.md). Step plan: [PHASE_6_PLAN.md](docs/PHASE_6_PLAN.md). Prerequisites: Phase 5 topics and Phase 4 auth.

### Work

- Add Problem and ProblemTopic schemas with ownership, required/optional fields, normalized URL uniqueness per user, and unique problem/topic associations.
- Implement problem create/read/edit/delete and atomic topic association updates. Verify all referenced topics belong to the authenticated owner.
- Preserve arbitrary supported HTTP/HTTPS platform URLs; do not restrict user entry to the three seeded platform records.
- Implement duplicate normalization exactly as specified without stripping meaningful path/query information.
- Build the typed problem API module and problem library, add/edit form, details, deletion confirmation, and topic assignment UI.
- Use realistic long titles, multiple tags, notes, and narrow screens to validate the UI scheme.
- Keep user data isolated: the same external URL may appear independently in different accounts.

### Exit criteria

Problem CRUD and multiple-topic assignment work through the real frontend/backend/database path, survive reloads, and preserve input on failures. Duplicate and ownership rules hold under concurrent requests. Topic deletion preserves problem records.

## Phase 7 — Implement completion, search, and progress

**Status: complete (2026-11-15).** See [PHASE_7_RESULTS.md](docs/PHASE_7_RESULTS.md) and [PHASE_7_PLAN.md](docs/PHASE_7_PLAN.md). Completion PATCH, FR-04 list query and browse UI, `GET /progress`, typed client, solve controls, and progress strip verified with `pnpm verify:phase-7` on a dedicated `*_test` database. Prerequisites: Phase 6 library CRUD and Phase 5 topics.

### Work

- Implement solved/unsolved transitions and completion timestamps, including idempotent repeated solved requests and clearing timestamps on reversion.
- Build quick completion controls with pending/error feedback. If optimistic updates are used, restore state after rejection and prevent out-of-order writes.
- Add title/platform-ID search; combined platform/topic/status filters; untagged filtering; sorting; and bounded pagination.
- Make multi-topic match semantics explicit and keep list results and their filtered totals consistent.
- Implement overall and per-topic progress summaries with correct unique-problem counting and empty-topic percentages.
- Integrate filters, topic views, and summaries in the frontend using shared API functions and the installed Solid 2 data/mutation/refresh primitives where appropriate.
- Invalidate/refetch only affected lists and summaries after writes. Do not refresh the auth session as part of ordinary product-data invalidation.

### Exit criteria

The primary workflow is complete: add a problem, assign topics, practice on its original platform, mark it solved, and see consistent counts across views. Combined filters, pagination, reversions, and multi-topic totals match the requirements.

## Phase 8 — Integrated quality and security validation

**Status: complete** (2026-11-15). Stepped plan: [PHASE_8_PLAN.md](docs/PHASE_8_PLAN.md). Results: [PHASE_8_RESULTS.md](docs/PHASE_8_RESULTS.md). Acceptance matrix: [PHASE_8_ACCEPTANCE.md](docs/PHASE_8_ACCEPTANCE.md). Automated gate: `cd solve-tracker-backend && TEST_DATABASE_URL=.../_test pnpm verify:phase-8`.

### Work

- Run every MVP acceptance criterion from the requirements against the integrated system.
- Check keyboard navigation, focus, form labels/errors, mobile layouts, readable dense tables, loading/empty/error states, and reduced-motion behavior.
- Recheck ownership on every list/detail/write/association/progress endpoint with at least two accounts.
- Exercise auth expiry, replay, logout/reset revocation, concurrent tabs, lost refresh responses, CSRF rejection, rate limits, and network/Resend failures.
- Verify generated API types and Swagger stay aligned with actual requests/responses. Search for product-level fetch calls bypassing the API client.
- Verify fresh-database migration application, repeated migration/seed runs, and normal data persistence without destructive resets.
- Run relevant backend/frontend build, type, lint, unit, HTTP, browser, and PostgreSQL integration checks. Report mocked coverage separately from live integration.
- Finish developer documentation and remove obsolete template/demo navigation from the product UI once real screens replace it.

### Exit criteria

All MVP acceptance criteria pass, material failures are fixed, and remaining limitations are documented. No incomplete feature is disguised by sample or placeholder data.

## Post-MVP — platform classification (optional hardening)

Persist and index **`problems.platform_slug`** (derived from URL via the shared catalog) so library filters, progress, and UI use one matcher. Phased steps **P1–P5**: [docs/PLATFORM_CLASSIFICATION_PHASED_PLAN.md](docs/PLATFORM_CLASSIFICATION_PHASED_PLAN.md). Does not block Phase 9 unless product prioritizes it.

## Phase 9 — Production preparation and release

**Codebase prep (in repo):** health probes (`GET /health`, `GET /health/ready`), stricter production env validation ([`backend/PRODUCTION.md`](backend/PRODUCTION.md)), `pnpm verify:phase-9`. Hosting, secrets, and live smoke remain deploy-time work.

### Work

- Implement production packaging for the chosen hosting platform; development Compose is not the production deployment definition.
- Configure HTTPS, same-origin API routing, validated secrets, database connectivity, production cookie behavior, Resend sender configuration, and trusted reset URLs.
- Apply private/no-store caching rules to session/personalized API responses and ensure proxies do not cache credentials or share user responses.
- Establish database backup/restore procedures, release-time migrations, safe logs, and a basic health check. Keep production seeds explicit and avoid inserting demo users.
- Prepare a deployment and recovery checklist; review migration SQL before release and make required approvals the final deployment step.
- After authorized deployment, smoke-test registration/login/recovery/logout, email delivery, problem/topic CRUD, completion, progress, and data isolation.

### Exit criteria

The authorized production release passes its smoke checks, has documented operational/recovery steps, and meets the MVP requirements.

## UI/UX pivot (post–MVP)

**Status:** planned. Design: [UI_UX_PIVOT.md](docs/UI_UX_PIVOT.md). Phased execution: [UI_UX_PIVOT_EXECUTION_PLAN.md](docs/UI_UX_PIVOT_EXECUTION_PLAN.md) (UX-1 … UX-7).

## Deferred work

Separate practice sheets, manual ordering, revision reminders, attempt history, bulk actions, CSV import/export, platform synchronization, goals, and sharing remain future phases unless explicitly promoted into the MVP. SSR, BFF, worker-based auth, Redis, generalized repository frameworks, and elaborate retry systems are not prerequisites for completion.

## Progress tracking rule

Track each phase as not started, in progress, blocked, or complete in the actual task tracker or a future progress table. Record evidence and blockers when updating status. Complete vertical features and their meaningful tests together; do not postpone all testing to Phase 8 or build every backend feature before the first frontend integration.
