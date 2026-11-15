# Phase 3 execution results

Date: **2026-11-10**. Status: **backend authentication implemented and locally verified against real PostgreSQL**. Docker-container validation and production email/deployment checks remain explicitly deferred; Phase 1 is not marked complete by these results.

## Implemented

- User, AuthSession, and PasswordResetToken schemas, domain barrels, v2 relation registry, and a new authentication migration. The original platform migration was preserved.
- Seven auth endpoints: register, login, read-only session, refresh, logout, forgot password, and reset password.
- Zod input contracts, code-point password/name limits, normalized email identity, database uniqueness handling, and public user response mapping.
- Argon2id hashing with independently generated salts; generic invalid-login responses and dummy verification for unknown accounts.
- Purpose-separated HS256 JWT access/refresh tokens with validated claims, different secrets, capped access expiry, and absolute session lifetime.
- HttpOnly cookie issue/clear behavior, production Secure/__Host configuration rules, explicit HTTP-development exceptions, and no JWT strings in public JSON.
- PostgreSQL-backed access-session validation, atomic rotation/digest replacement, replay revocation, current-session logout, and all-session invalidation after reset.
- Consistent user-first transaction locking and credential rechecks for login versus password reset. Replay errors are raised after the revocation transaction commits.
- Single-use opaque reset tokens, digest-only persistence, cooldown/replacement, trusted fragment reset URLs, and transactionally applied password/session changes.
- Resend SDK integration with finite timeout and safe failure handling; explicit mock mode with no sends, prohibited in production.
- Origin/custom-header enforcement on unsafe auth operations, scoped 16 KiB JSON-body limits, bounded per-process initial rate limits, safe error responses/field details, and private/no-store session headers.
- Injectable access guard and authenticated identity for later product modules; no topic/problem CRUD was added.
- Real Swagger auth schemas, updated OpenAPI snapshot/generated types, and `createAuthApi` frontend functions with runtime response narrowing and auto-recovery explicitly disabled.

The frontend auth provider, forms, route gating, Web Locks, and cross-tab recovery are still Phase 4. The frontend transport does not spontaneously call these endpoints.

## Dependencies and configuration

Installed exact runtime versions: `jose` 6.2.16, `argon2` 0.45.2, `resend` 6.37.0, `cookie` 2.0.2, and direct `express` 5.3.0. First-party Nest auth options were inspected; the selected low-level JWT integration supports this project's explicit rotating-cookie/PostgreSQL-session contract without adding Passport or another auth framework.

Argon2's required native binding install hook was explicitly enabled for its pinned version. Host execution passed under temporary Node **24.22.2**, pnpm **12.18.0**. The Docker image's native-binding build remains unverified because daemon access is denied.

Extended environment validation and `.env.example` with auth policy, cookie/origin, hash-cost, and conditional Resend values. The ignored local `.env` received newly generated independent development signing secrets and explicit mock-email settings; existing database configuration was preserved. No real Resend credential was generated, requested, or used. Example signing secrets remain blank for the developer to generate securely.

Database-only CLI commands validate their database configuration separately, so migration/seed use with an external DB does not require unrelated HTTP/email credentials.

## Real database verification

Docker access was rechecked outside the sandbox and still failed with OS socket permission denied. Instead, execution downloaded an isolated PostgreSQL **18.4** binary runtime under `/tmp/practice-phase3-pg`, started it on localhost:55433 with its own data directory/database `practice_auth_test`, and made no system-user or existing-database changes.

The committed integration script requires an explicit TEST_DATABASE_URL whose database name ends in `_test`; it never falls back to the application URL. It applies committed migrations and deletes only users created by that test run, with FK cascades for their auth data. It does not truncate/drop schemas or reset volumes. Email delivery is mocked in this suite.

**38 PostgreSQL/HTTP assertions passed**, including:

- Actual Argon2 storage/verification and concurrent email uniqueness.
- JWT purpose separation, access authentication, distinct-device sessions, rotation with unchanged absolute expiry.
- Replay commits revocation; concurrent reuse creates one successor and then invalidates the family as required.
- Logout versus refresh leaves the session revoked.
- A password reset completed while an old login verification was paused prevents that login from creating a session.
- Reset cooldown, replacement, expiry, concurrent one-use consumption, old-password rejection, new-password success, and revocation of existing access.
- Session absolute expiry rejects access and refresh.
- HTTP Origin/header rejection, unknown fields, actual JSON size limit, cookie flags, read-only uncached probe, and logout.
- Rate enforcement applies to normalized route aliases and returns Retry-After.
- Secure production cookie formatting and correct immediate clearing attributes.
- Exactly seven real documented auth routes.

This is real PostgreSQL transaction testing, not a WASM/in-memory database or mocked repository. It is not verification of the inaccessible Docker volume or production database.

## Other checks

| Check | Result |
| --- | --- |
| Backend build, full type check, lint | Passed |
| Backend unit suite | **36 passed** |
| Existing backend HTTP suite | **3 passed**, database provider replaced |
| Frontend type check, lint, build | Passed |
| Frontend suite | **43 passed**, including typed auth decoding/recovery exclusion |
| Drizzle metadata check | Passed |
| Second schema generation | No changes to migrate |
| OpenAPI export/check and frontend type generation/check | Passed |
| Resend unit tests | Mock mode does not send; SDK call/link/timeout verified; provider rejection safely handled |

Unit JWT tests cover incorrect issuer/audience/purpose/algorithm, expiry, and signing separation. Config tests cover independent secrets, hash-cost bounds, and unsafe production settings. No real email was sent.

A local baseline hash measurement produced **29, 27, and 27 ms** for three sequential Argon2id operations at 19456 KiB / 2 iterations / 1 lane. This is a development-host observation, not production concurrency/capacity validation.

## Fixes found during implementation

- Declared Express directly because scoped JSON middleware imports it; no reliance on a transitive runtime dependency.
- Wrapped the auth-only JSON parser with a distinct name so Nest still installs its default parser for other routes. Existing non-auth HTTP tests now continue to pass.
- Mapped the actual generated PostgreSQL email uniqueness constraint using structured error fields.
- Preserved replay revocation by committing the transaction before throwing its auth error.
- Protected against expired-access logout, route alias rate-limit bypass, stale login verification after reset, and uncontrolled key-bucket growth.

## Handoff and remaining gates

- Phase 4 consumes `createAuthApi` and implements actual browser state, forms, cookie/proxy integration, and single-flight/multi-tab coordination.
- Docker image build/runtime remains a Phase 1 follow-up. Existing local application database settings/volumes were not migrated or altered.
- Production needs real Resend sender/domain/key and an explicitly authorized delivery test, HTTPS/public origin, trusted proxy/client-IP handling, multi-instance rate enforcement, secret storage/rotation procedure, and representative hash capacity testing.
- Email verification remains deliberately deferred; do not label user addresses as verified.
- Update caller credentials/config before running the backend; the auth environment is now required. Consult the backend README for scripts and the dedicated test-DB safeguards.

The disposable PostgreSQL verification process is stopped after execution; its test data/runtime remain under `/tmp` only. No application or frontend dev server is left running by this phase.
