# Phase 0 — Decision and execution plan

Status: **complete as a planning phase on 2026-11-10**. The user requested execution; selected policies and remaining release dependencies are recorded in [PHASE_0_DECISIONS.md](./PHASE_0_DECISIONS.md). The proposal table below is retained as planning history; the decision record supersedes it.

Purpose: remove ambiguity before implementation, while keeping the MVP small. This phase produces agreed scope and configuration contracts, not auth code, new schemas, credentials, deployments, or emails. It expands [Phase 0 of the execution plan](../PROJECT_EXECUTION_PLAN.md#phase-0--resolve-mvp-decisions).

## 1. Preserve decisions already made

Do not reopen these unless the user requests a change:

- A user creates problems for their own practice; problems, topics, notes, and progress are private.
- Registration requires only name, email, and password. Include login, logout, forgot-password, and reset-password.
- Authentication uses JWT access/refresh tokens; passwords use Argon2id; email uses Resend.
- PostgreSQL, Docker development/watch mode, Drizzle ORM/Kit 1.0.0-rc.5, Zod, Swagger, and pnpm remain selected.
- Frontend uses its installed Solid 2 Vite Start-mode CSR setup and Tailwind 4 UI foundation.
- Frontend networking uses a shared typed API client and feature API modules; components do not scatter fetch calls.
- Follow the documented HttpOnly-cookie and same-origin API approach, including coordinated refresh. Do not add SSR or an auth framework solely for sessions.

Product assumptions and assistant-selected technical proposals must remain distinguishable from explicit user requirements. The requirements currently specify immediate session revocation; preserve it unless a change is explicitly accepted.

## 2. Decision register

Each row starts **proposed** unless identified as a current documented requirement. Record the accepted value and rationale during execution. Do not generate actual secrets into this file.

| ID | Decision | Proposed MVP choice | Needed before |
| --- | --- | --- | --- |
| P01 | Topics versus sheets | Topics and tags are one concept; no separate collections | Topic/problem schema design |
| P02 | Problem entry | Manual title/URL/platform entry; CSV and metadata lookup deferred | Problem UI/API |
| P03 | Solve dates | Server-recorded timestamp when solved; no editable historical date initially | Completion contract |
| P04 | Email verification | Defer verification; require no extra registration fields. Document that unverified email ownership has not been established | Registration/recovery design |
| A01 | Access lifetime | 10 minutes, explicit validated environment value | JWT implementation |
| A02 | Refresh lifetime | Absolute 7-day session lifetime; rotation does not extend that absolute deadline; no Remember me option initially | Session schema/rotation |
| A03 | Reset lifetime | 30 minutes; one usable token per user; a new request invalidates prior reset tokens | Reset-token schema |
| A04 | Logout invalidation | Retain immediate revocation via the PostgreSQL session row; no Redis or independent denylist | Auth guard/session schema |
| A05 | Signing | HS256 for the single Nest issuer/verifier, with independent randomly generated access/refresh secrets of at least 32 bytes each; allowlist the algorithm | JWT service/config |
| A06 | JWT identity | Server-controlled subject/user ID, session ID, token purpose, issuer/audience, issued/expiry times; refresh generation/identity supports rotation | JWT/session contract |
| A07 | Password policy | 8–128 Unicode code points, allow spaces/paste/password managers, no silent trimming/truncation, no arbitrary composition rules or scheduled changes | Registration/reset schemas |
| A08 | Hash cost | Start at Argon2id memoryCost=19456 KiB, timeCost=2, parallelism=1; benchmark before production and increase if practical | Hashing implementation and deployment sizing |
| A09 | Credential digests | Hash high-entropy refresh/reset tokens with SHA-256 for lookup/comparison; Argon2id is for human passwords | Session/reset persistence |
| E01 | Email sender | User supplies the intended verified sending domain/address and display name; no invented production sender | Live Resend verification |
| E02 | Reset destination | Trusted configured frontend origin plus fixed `/reset-password` path; never request-header-derived | Reset email/link contract |
| D01 | Public topology | One HTTPS public origin; `/api` proxies to Nest; frontend static assets elsewhere under the same origin | Proxy/cookie configuration |
| D02 | Hosting provider | Leave provider choice open while defining its required capabilities | Production-specific packaging |
| D03 | Development cookies | Prefer local HTTPS for production-like tests; explicitly isolated HTTP-development settings only if needed | Browser auth testing |
| C01 | Cross-tab support | Supported secure-context browsers use Web Locks plus session recheck; no worker fallback in MVP | Frontend recovery implementation |

The numeric token lifetimes above are project proposals, not security standards. Choose explicit values; never turn them into hidden Compose/application fallbacks.

The password length proposal follows [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) for password-only authentication. The Argon2id baseline follows [OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). The baseline is a minimum starting point, not proof that deployment capacity is adequate. Shared-secret signing is a project simplification for one backend; reconsider asymmetric keys if separate services must independently verify tokens.

### Important consequences to record

- Immediate revocation means a session-validity lookup on protected requests. The simpler alternative—short-lived stateless access JWTs—allows already-issued tokens to remain valid until expiry. Do not claim both stateless verification and immediate invalidation without additional state.
- Deferring email verification does not verify ownership of a registered address. Document the risk of mistyped/preclaimed addresses before public registration; revisiting verification must not silently expand signup fields.
- Rotated refresh tokens keep the session's original absolute deadline. A new login creates a new session; repeated refresh must not create an indefinitely renewable session accidentally.
- Cookie-backed JWTs still need CSRF defenses. Keep the same-origin custom-header/Origin policy in the auth conventions; do not add synchronizer-token machinery unless the request architecture changes.

## 3. Execute in this order

### Step 0.1 — Reconcile scope

Review the requirements against P01–P04 and the original spreadsheet-style workflow. Present those four choices together, record the user's answers, and update only the accepted scope. Keep additional statuses, sheets, history, import, sharing, and automatic platform synchronization deferred unless promoted explicitly.

Deliverable: an agreed MVP feature boundary, including whether historical solve dates or email verification must be included.

### Step 0.2 — Settle authentication policy

Review A01–A09 as one coherent policy rather than independent library defaults. Confirm immediate-revocation semantics and absolute session expiry. Define login/registration behavior (proposed: registration returns success, then the user logs in through the normal login flow). Define logout as current-session logout; password reset revokes all sessions.

Keep Argon2 benchmarking as an implementation/deployment check: Phase 0 chooses the baseline and measurement task; it must not claim the benchmark already passed. Use one consistent Unicode-length rule on frontend/backend and an explicit request-body size limit in implementation.

Deliverable: accepted auth policy, including password limits and token/session lifecycle. Signing secrets are generated securely later, not requested through chat or placed in documentation.

### Step 0.3 — Define auth and API contracts

Write a small endpoint matrix before implementation: registration, login, read-only session probe, refresh, logout, forgot password, and reset password. Specify method, input schema, safe response, cookies, errors, and whether credentials/CSRF headers are required. Endpoint paths remain proposals until the backend contract is implemented.

Define how the client distinguishes recoverable expired/missing access from terminal invalid/revoked sessions and from 403 permission failures. Preserve one refresh attempt and one eligible request retry, not a generic retry engine. Confirm that the shared transport—not components—owns this behavior.

Include a concrete initial abuse-limit proposal for login, registration, and recovery, then validate it against hosting/IP topology before implementation. Do not introduce permanent account lockout or a distributed rate-limit service without a need. Multiple backend instances require shared limiter state or a trusted edge policy; that deployment detail can wait until instance count is known.

Deliverable: enough agreement for Phase 2 to implement the typed API boundary and Phase 3 to implement real endpoints. OpenAPI generation follows actual endpoints; do not generate speculative client contracts now.

### Step 0.4 — Specify email and origin configuration

List required configuration names and meanings without values containing secrets. Suggested names include `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ACCESS_TTL_SECONDS`, `AUTH_SESSION_TTL_SECONDS`, `PASSWORD_RESET_TTL_SECONDS`, `RESEND_API_KEY`, `RESEND_FROM`, `FRONTEND_ORIGIN`, and proxy upstream configuration.

Confirm Resend sender identity and the reset URL. Provider credentials belong in the appropriate secret/configuration mechanism. Routine tests mock Resend; real sending is a later explicitly authorized integration check.

Write the routing contract: browser origin → `/api` proxy → Nest; proxy preserves cookie response headers and the trusted public Origin; backend validates configured public origin rather than treating arbitrary forwarded headers as trusted. Production requires HTTPS and private/no-store handling for session/personalized responses.

Deliverable: configuration contract and a topology sketch. Exact hosting provider, real secrets, and DNS setup are not required to design local APIs.

### Step 0.5 — Record accepted choices and hand off

Update the source documents together so they do not contradict one another:

1. `backend/REQUIREMENTS.md`: accepted scope and auth lifecycle; remove resolved questions.
2. `solve-tracker-frontend/AUTH_CONVENTIONS.md`: token lifetimes/transport and recovery decisions where relevant.
3. Backend/frontend conventions: only changed implementation boundaries or policies.
4. This decision register: accepted/proposed/deferred status, selected values, and brief rationale.
5. `PROJECT_EXECUTION_PLAN.md`: Phase 0 outcome and remaining dependent blockers.

Do not set up accounts, send test email, generate product tables, change dependency versions, or implement authentication merely to mark planning complete.

## 4. Dependencies and deferrals

| Open item | Blocks | Does not block |
| --- | --- | --- |
| Sheets versus topic-only organization | Final organization schema/UI | Existing Docker verification |
| Auth expiry/revocation policy | Session schema, auth guards, refresh behavior | UI primitives and transport skeleton |
| Password policy/Argon2 baseline | Registration/reset implementation | Migration tooling checks |
| Resend sender/domain | Real email delivery verification | Mocked provider tests and reset endpoint development |
| Public origin | Final secure-cookie/CSRF configuration and deployed reset links | Locally configured development |
| Exact hosting provider | Production packaging, secrets/DNS/release | Provider-neutral same-origin architecture and local feature development |

A missing production domain should not hold up unrelated local implementation. Record a follow-up owner/task and resolve it before the affected release check.

## 5. Phase 0 completion gate

- [x] P01–P04 are accepted or their impact is explicitly deferred.
- [x] Authentication policy has explicit values and consistent logout/reset/rotation semantics.
- [x] Endpoint/configuration contracts are sufficiently defined for dependent implementation, with undecided names/details clearly marked.
- [x] Same-origin CSR deployment assumptions and browser support are documented.
- [x] Email sender/origin requirements are recorded, with real-world values either available or tracked as release blockers.
- [x] No secrets appear in documents; no external side effects were performed as part of planning.
- [x] Requirements, conventions, and execution plan agree.
- [x] Remaining blockers identify the specific task they block, not the entire project by default.

Phase 0 can complete with production-provider selection or real Resend credentials deferred, provided local implementation contracts are settled and release dependencies are explicit. Phase 0 execution produced the linked decision record and synchronized requirements/conventions. Production credentials, provider selection, and runtime benchmarks remain explicitly deferred release tasks.
