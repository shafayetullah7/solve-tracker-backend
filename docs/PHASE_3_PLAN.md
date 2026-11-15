# Phase 3 — Backend authentication execution plan

Status: **implemented and locally verified**. See [PHASE_3_RESULTS.md](PHASE_3_RESULTS.md) for real PostgreSQL/HTTP evidence and remaining Docker/production checks.

Outcome: real backend account and session APIs, single-use password recovery through Resend, accurate OpenAPI contracts, and verified persistence/rotation behavior. Frontend auth screens and browser refresh coordination remain Phase 4.

Follow [Phase 0 decisions](PHASE_0_DECISIONS.md), [requirements](../backend/REQUIREMENTS.md), [backend conventions](../backend/BACKEND_CONVENTIONS.md), and [Drizzle conventions](../backend/DRIZZLE_CONVENTIONS.md). Preserve the Phase 2 shared API boundary and generation commands.

## 1. Dependencies, scope, and completion boundary

- Phase 2's transport and real-route contract generation exist. Extend their contracts; do not replace the client or add a second HTTP stack.
- Phase 1 live Docker/PostgreSQL verification is still blocked. Recheck access at execution start. Independent code/unit work can proceed, but Phase 3 cannot be marked complete without real PostgreSQL concurrency and constraint tests.
- Use a dedicated known-safe integration database. Never point cleanup/migration tests at an unknown local or production database.
- Do not implement topic/problem schemas, SSR, Redis, a background worker, email verification, OAuth, MFA, or frontend auth screens in this phase.
- Real Resend credentials/sender ownership remain a release dependency. Mocked email delivery can support development; real sends require explicit authorization and a controlled recipient. No credentials go into chat, snapshots, or logs.

## 2. Implementation shape

Create concrete modules/providers only where needed:

```text
backend/src/
  modules/auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    auth.repository.ts
    password.service.ts              # Argon2id hashing and verification
    token.service.ts                 # purpose-separated JWT handling
    guards/                          # access guard; request-protection as appropriate
    schemas/                         # Zod request and public response contracts
  modules/email/
    email.module.ts
    email.service.ts                 # one Resend integration and injectable test replacement
  database/schema/
    users/
      users.table.ts
      index.ts
    auth/
      auth-sessions.table.ts
      password-reset-tokens.table.ts
      index.ts
    relations.ts
    index.ts
```

AuthService orchestrates use cases/transactions. AuthRepository owns persistence queries and accepts the transaction client for atomic operations. Password/JWT/email providers isolate library-specific operations and are injectable in tests. Do not build generic repository/email-provider frameworks or expose password hashes through user DTOs.

## Step 3.1 — Verify libraries and environment contract

- Inspect installed Nest 12 declarations and current first-party auth/config/security support before selecting packages; do not copy old Passport/Jest/class-validator examples.
- Select the smallest maintained JWT, Argon2, Resend, and rate-limit integrations compatible with the current ESM/Node/Nest stack. Verify their actual current APIs/documentation during execution and record versions. Do not install a second auth framework merely for convenience.
- Confirm Argon2's native module works on host Node 24 and the development container image; approve only required package build scripts after inspection.
- Add the Phase 0 variables to the Zod environment schema and `.env.example`: JWT keys/issuer/audience/TTLs, hash parameters, cookie policy, trusted frontend origin, email mode/Resend credentials, and any explicitly required limiter configuration.
- Validate secret independence and minimum strength, integer bounds, positive lifetimes, supported modes, trusted origin shape, and production Secure/__Host cookie rules. Do not create hardcoded Compose environment defaults.
- Tests use isolated explicit fixtures and mock email mode. Production rejects mock email mode; Resend mode requires sender/key. Keep existing dotenv precedence and typed ConfigService access.
- Verify OpenAPI export remains database-independent. Supply explicit safe test/export configuration where necessary rather than bypassing the new validation or committing real keys.

**Pass:** supported dependency/runtime choices, validated configuration contracts, and safe fixtures; no unintended framework upgrades.

## Step 3.2 — Add minimal authentication schemas and migrations

Define tables through existing domain barrels and update the central v2 relation registry:

| Table | Required persistence |
| --- | --- |
| users | UUID primary key, trimmed name, normalized unique email, encoded password hash, created/updated timestamps |
| auth_sessions | UUID primary key, user FK, current refresh digest/identity, absolute expiry, revoked timestamp/state, created/updated timestamps |
| password_reset_tokens | UUID primary key, user FK, unique token digest, expiry, consumption/revocation state, creation timestamp |

- Use PostgreSQL timestamptz and UTC consistently. Add indexes supporting email lookup, sessions by user, and reset digest lookup.
- Enforce unique normalized email in PostgreSQL, including concurrent registration attempts. Ensure reset issuance can replace all prior usable tokens for that user transactionally.
- Keep access/refresh credentials out of raw persistent columns. Password hashes use Argon2id; high-entropy refresh/reset credentials use SHA-256 digests.
- Do not add refresh-history tables unless required by the concrete replay design. A verified, purpose-correct, unexpired JWT bound to the same session/user but mismatching its current refresh digest can identify an old/invalid generation; document the exact test before choosing additional storage.
- Generate a new migration, review its SQL/snapshot, and check no unexpected changes. Preserve the existing platform migration; do not regenerate/reset it to make tests pass.

**Pass:** metadata/type checks plus actual migration/constraint tests on the dedicated database. If PostgreSQL remains inaccessible, record that gate as blocked.

## Step 3.3 — Implement validation, password hashing, and registration

- Implement Zod request schemas exactly matching Phase 0: name 1–100 trimmed Unicode code points, validated normalized email <=254 characters, passwords 15–128 Unicode code points without trimming/truncation.
- Apply the 16 KiB auth JSON-body limit, unknown-field rejection, and consistent safe validation error responses. Do not depend on browser validation.
- Implement Argon2id hashing/verification using selected baseline costs and library-managed random salts. Never compare password hashes by string equality or return them to callers.
- Registration takes name/email/password only, creates a user, and returns 201 safe user metadata without login cookies. Convert email uniqueness conflicts into `EMAIL_IN_USE` without string-matching database messages.
- Normalize email consistently for registration, login, and recovery; do not perform Gmail-specific transformations.

**Pass:** correct validation including Unicode boundaries, encoded hashes, verification, duplicate/concurrent registration, and no credential leakage.

## Step 3.4 — Establish cookie, request-protection, and error boundaries

- Implement exact Phase 0 cookie names/flags for production versus explicit HTTP development. Issue/clear HttpOnly cookies through backend responses with matching identity attributes; never return JWTs in JSON.
- Implement trusted-Origin plus required `X-Requested-With: practice` validation for unsafe browser endpoints, including public registration/login/recovery. Require JSON for body-bearing operations and keep GET free of side effects.
- Do not weaken CORS to make the development proxy work. Preserve original public Origin through the proxy and configure trusted proxy/client-IP handling explicitly.
- Establish documented `{ statusCode, code, message, details? }` auth errors, preserving unexpected failures as 500/503 and not exposing upstream/provider/database messages.
- Add private/no-store response headers. Ordinary protected 401 responses must not clear cookies, which could clobber a later successful login/refresh.
- Put limits on the auth routes using the Phase 0 initial values. Tests control clocks/state; no permanent account lockout. Do not claim an in-memory limiter works across multiple server replicas.

**Pass:** cookie identity/clearing, CSRF/media-type/Origin rejection, safe errors, cache headers, and rate-limit behavior are tested without public infrastructure changes.

## Step 3.5 — Implement login, access guard, and read-only session inspection

- Verify credentials and return generic `INVALID_CREDENTIALS` for wrong email/password. Avoid a trivial nonexistent-account timing shortcut; use a controlled dummy hash verification where appropriate, behind rate limits.
- Create a session with a 7-day absolute deadline; issue access <=10 minutes and refresh capped by that deadline. Verify HS256 allowlist, issuer, audience, purpose, sub/sid/jti, and expiry explicitly.
- On successful login, replace/revoke this browser's prior valid session as specified, without ending other devices. Failure does not mutate an unrelated session.
- Protect API requests with JWT validation plus a non-revoked/unexpired PostgreSQL session lookup belonging to the same user. Attach a typed authenticated identity for later features; never accept ownership from the body.
- Implement `GET /auth/session` returning safe user metadata. It is read-only, does not inspect/consume refresh credentials, and does not renew cookies.
- Missing/expired access returns `AUTH_REFRESH_REQUIRED`; invalid signature/purpose or a revoked session returns `AUTH_SESSION_INVALID`. Permission failures remain 403.

**Pass:** real login/session behavior, purpose/signature/expiry boundaries, revocation, safe responses, and multiple independent sessions. Root scaffold may remain public; no dummy product endpoint is needed to test the guard.

## Step 3.6 — Implement refresh, replay detection, and logout atomically

- Refresh uses only the refresh cookie plus the unsafe-request protections. Verify signature/purpose/claims before treating its identity as trusted.
- Lock/read the relevant session and compare its current digest/identity inside one transaction. A valid generation produces exactly one successor; update digest and timestamps atomically without extending absolute session expiry.
- A correctly authenticated stale generation triggers the documented replay/revocation policy. Malformed random credentials must not allow an unauthenticated caller to revoke an arbitrary claimed session.
- Two genuinely simultaneous uses of the same refresh credential may yield one successful rotation and one replay-triggered revocation. Test that explicit policy: the successor must not stay usable after family revocation. Frontend locking in Phase 4 prevents legitimate tabs from routinely causing this outcome.
- Logout accepts an appropriate verified access or refresh identity so expired access does not prevent revocation. Revoke only the current session and clear cookies; no-session logout is still 204 and repeatable.
- Make reset/login/refresh/logout ordering consistent. Choose a documented lock order (user row before that user's session/token rows) for session-changing transactions. Verify credentials outside expensive transaction locks, then recheck the credential/user version or hash after acquiring the lock so a concurrent password reset cannot create a session from an old verified password.
- Set replacement cookies only for a successful completed rotation. Do not build a grace window, automatic refresh retry, or duplicate-successor policy to mask races.

**Pass:** PostgreSQL concurrency tests for rotation, replay, logout versus refresh, reset versus login, and session deadline boundaries—not just mocked repository tests.

## Step 3.7 — Implement forgot/reset password with Resend

- Generate an opaque token with >=32 random bytes; persist only its digest. Under transaction/consistent locks, invalidate prior usable reset tokens and persist the new 30-minute token, respecting the cooldown.
- Build links solely from configured trusted origin and fixed `/reset-password#token=...`, matching the CSR plan. Never use untrusted Host/redirect input, and do not log the URL/token.
- Commit token state before contacting Resend and keep provider I/O outside database locks. Use the existing provider SDK's finite timeout/idempotency facilities where appropriate; avoid blind retries after ambiguous acceptance. No queue/worker is required for the MVP.
- Return the same generic 202 recovery response for registered/unknown/cooldown-suppressed addresses and provider-delivery failure; log operational failure safely. Do not promise delivery or change the current password on send failure. Do not reveal account existence through a special per-account error response.
- Reset validates the token digest, expiry, unused state, and new password. Hash outside long-held locks where possible, then revalidate under lock and atomically change the hash, consume/invalidate reset tokens, and revoke all sessions.
- Expired/used links return `RESET_TOKEN_INVALID`. Successful reset returns 204, clears this browser's cookies, and requires normal login. Existing access tokens fail immediately through session revocation checks.
- Inject a mock email provider into routine tests. No real Resend send happens just because the test suite runs.

**Pass:** single-use/expiry/replacement, concurrent reset, session invalidation, generic responses, and controlled provider-failure tests. Real delivery remains explicitly unverified until authorized and configured.

## Step 3.8 — Publish accurate API contracts to the frontend

- Annotate actual request and safe response schemas/errors/cookies through the installed Nest Swagger/Zod interfaces.
- Export the real contract with `pnpm api:export` from backend and generate frontend types with `pnpm api:generate` from frontend. Run both check commands to detect drift.
- Add a thin typed `auth.api.ts` using the existing transport, with recovery disabled for login/register/refresh/logout/recovery calls. The session probe is controlled by the later coordinator and must not recursively trigger automatic refresh.
- Use explicit decoding/narrowing for JSON responses where runtime assurance is required; generated TypeScript alone does not validate network data. Keep auth UI/state out of these API functions.
- Update READMEs/environment examples and link the implemented contracts to the auth conventions. Do not create token storage in the frontend.

**Pass:** real generated auth types and callable API definitions exist without a frontend auth provider or fabricated endpoint contracts.

## Step 3.9 — Verification and handoff

Run relevant backend and frontend build/type/lint/tests, migration metadata checks, and OpenAPI/type drift checks under supported Node 24. Add dedicated HTTP and PostgreSQL integration suites with explicit test-database safeguards and cleanup; preserve the current database-independent export/unit workflow.

Minimum scenarios:

| Area | Required evidence |
| --- | --- |
| Accounts/passwords | Valid signup/login, unknown fields, Unicode limits, duplicate race, wrong credentials, no hash leakage |
| JWTs/cookies | Wrong algorithm/key/issuer/audience/purpose, expiry, Secure/HttpOnly/SameSite, clearing identities, no JSON token exposure |
| Sessions | Independent devices, read-only probe, absolute expiry, immediate revocation |
| Rotation | One successor, replay revocation, simultaneous requests, revoked token rejection |
| Recovery | Unknown email, cooldown, provider failure, expiry, token replacement/reuse, concurrent reset |
| Cross-operation races | Reset/login and logout/refresh cannot restore an invalidated session |
| Request security | Origin/header/content-type rejection, body limits, rate limits, safe errors, cache rules |
| Contracts | Accurate OpenAPI snapshot, generated frontend types, raw auth transport without recursion |

Record `docs/PHASE_3_RESULTS.md` during execution with files, versions, checks, live versus mocked coverage, and remaining release dependencies. Do not create a result file or mark checks passed merely because this plan lists them.

## Completion gate

- [x] Account/session/reset schemas and reviewed migrations exist and run on a known-safe PostgreSQL target.
- [x] All seven auth endpoints meet the Phase 0 contract.
- [x] Argon2id, purpose-separated JWTs, cookies, request protections, and initial abuse limits are implemented.
- [x] Atomic rotation/replay/revocation/reset behaviors pass real database tests.
- [x] Resend integration passes mocked acceptance/failure tests without real emails; live-delivery status is explicit.
- [x] Auth configuration is validated and examples/docs are synchronized without secrets.
- [x] Actual Swagger contracts and generated frontend auth types are current.
- [x] Build/type/lint/tests pass and the handoff identifies any unverified production-only checks.

Phase 3 is not complete if PostgreSQL concurrency verification remains blocked. Resend domain ownership, real sending credentials, production-scale hash benchmarking, and final hosting configuration may remain documented release gates; they must not be misrepresented as tested. Phase 4 then consumes the backend through the typed client and implements browser session state and cross-tab coordination.
