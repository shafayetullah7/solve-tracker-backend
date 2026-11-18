# Phase 0 — Implementation decisions and contracts

Status: **selected for implementation on 2026-11-10**, following the instruction to execute Phase 0. Explicit user requirements are preserved; previously proposed MVP defaults below were selected during execution. This record does not claim the user individually specified every numeric value. Authentication and the described endpoints are not implemented yet.

## MVP boundary

- Topics and tags mean the same thing. No separate sheets/collections in the MVP.
- Manual problem entry; no CSV import, scraping, automatic metadata lookup, or platform synchronization.
- Solved timestamps are assigned by the server. No historical date editing initially.
- Email verification is deferred. Registration creates an account and returns success; the user then logs in through the login flow. No extra registration fields.
- All problems, topics, notes, associations, and progress belong to their authenticated user. Only platform reference data may be shared.
- Keep the current Solid 2 Vite Start-mode CSR frontend, typed API client, Nest backend, and PostgreSQL. No SSR, BFF, Redis, worker, or new auth framework. Optional Google OAuth is an **FR-07 addendum** ([GOOGLE_OAUTH_A0_RESULTS.md](GOOGLE_OAUTH_A0_RESULTS.md)): thin backend OAuth + same JWT cookies, not Passport or a parallel auth stack.

Unverified registration does not establish email ownership. A mistyped/preclaimed address may be recovered by its actual mailbox holder. Treat this as a documented MVP limitation; do not silently merge account data or represent an address as verified. Reassess verification before a broader public launch.

## Authentication policy

| Setting | Selected value |
| --- | --- |
| Access JWT lifetime | 600 seconds; cap at the session's remaining lifetime |
| Session/refresh maximum lifetime | 604800 seconds (7 days) from login, absolute; rotation never extends it |
| Password-reset lifetime | 1800 seconds (30 minutes); latest issued token replaces earlier usable tokens |
| Signing | HS256, explicitly allowlisted, independent access and refresh secrets with at least 32 random bytes each |
| JWT claims | `sub` user ID, `sid` session ID, `jti` token ID, `purpose`, `iss`, `aud`, `iat`, `exp`; refresh identity checked against server state |
| JWT purpose | Distinct `access` and `refresh`; never accept refresh JWTs on product endpoints |
| Password | 8–128 Unicode code points; preserve spaces and case; no trimming/truncation/composition rules |
| Password hashing | Argon2id; memoryCost 19456 KiB, timeCost 2, parallelism 1; library-generated random salt |
| Refresh/reset storage | SHA-256 digest of high-entropy credential; never raw token values |
| Reset credential | Opaque cryptographically random token with at least 32 random bytes; not an access/refresh JWT |
| Logout | Revoke current session and clear cookies; repeatable |
| Password reset | Change hash, consume token, and revoke all user sessions atomically |
| Revocation | Immediate: protected requests check the PostgreSQL session row as well as JWT validation |

A new login creates a separate session; logout does not terminate other devices. Disabled, revoked, or absolutely expired sessions cannot refresh or authorize requests. Refresh uses an atomic compare-and-replace transaction; consumed credentials cannot produce a second successor. Keep enough expiry-bounded token identity/digest history to detect replay and revoke the associated family. Do not introduce a separate cache/lock service for this.

Implement code-point length consistently in frontend/backend; JavaScript `.length` counts UTF-16 code units and is not sufficient for this policy. Registration name: trimmed, 1–100 code points. Email: trimmed, validated, maximum 254 characters, and lowercased consistently for account identity; no provider-specific dot/plus rewriting. Passwords remain unchanged. Apply a 16 KiB JSON-body limit to auth endpoints.

Hash parameters are a baseline, not a completed benchmark. Phase 3 verifies the library/platform behavior; Phase 9 measures latency and memory under expected concurrency and increases cost if capacity permits. Store encoded parameters with hashes so later upgrades can rehash on successful login.

JWT issuer/audience are explicit validated environment strings. Define the configured audience as the API authority, verify the token purpose separately, and reject wrong algorithms/issuer/audience. Signing keys are created and stored during implementation/deployment, never in this document. Document a controlled key replacement process before release; replacing a single configured secret invalidates the corresponding existing tokens rather than providing seamless key rotation.

Password length and hashing baseline are informed by [OWASP authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) and [password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). The selected expiry times are project policy, not mandated standard values.

## Auth endpoint contract

Public paths include `/api`; the same-origin proxy removes that prefix before forwarding to Nest's `/auth/*` routes. Configure one rewrite only. All responses use JSON except 204 responses. No auth endpoint returns JWT strings in JSON.

| Endpoint | Input | Success | Cookies / protection |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `{ name, email, password }` | 201 `{ user: { id, name, email } }` | No auth cookies; Origin/custom-header checks required |
| `POST /api/auth/login` | `{ email, password }` | 200 `{ user: { id, name, email } }` | Sets access/refresh cookies; Origin/custom-header checks required |
| `GET /api/auth/session` | No body | 200 `{ user: { id, name, email } }` | Read-only access/session validation; no rotation or cookie renewal |
| `POST /api/auth/refresh` | No body | 200 `{ user: { id, name, email } }` | Validates refresh cookie, rotates atomically, sets replacement cookies; Origin/custom-header checks required |
| `POST /api/auth/logout` | No body | 204 | Revokes current session and clears cookies even when access expired; use valid refresh identity if available; Origin/custom-header checks required |
| `POST /api/auth/forgot-password` | `{ email }` | 202 `{ message: "If an eligible account exists, password reset instructions will be sent." }` | Same public response independent of account existence; Origin/custom-header checks required |
| `POST /api/auth/reset-password` | `{ token, password }` | 204 | Consumes reset token and revokes all sessions; clears this browser's cookies; Origin/custom-header checks required |

Reject unknown body fields. A repeat logout with no valid session still clears cookies and returns 204. Failed credentials do not mutate an unrelated existing session. A successful login revokes an existing valid refresh session in this browser before replacing its cookies, without terminating sessions on other devices.

Use a consistent error shape `{ statusCode, code, message }`, plus optional safe `details` for validation fields. The shared client relies on `code`, not message text. Do not add a generic success envelope around existing domain response conventions.

| Condition | Status / code | Client behavior |
| --- | --- | --- |
| Input validation | 400 `VALIDATION_ERROR` | Show safe field errors; no refresh |
| Email already registered | 409 `EMAIL_IN_USE` | Show registration conflict; no refresh |
| Invalid login | 401 `INVALID_CREDENTIALS` | Generic message; no refresh |
| Missing/expired access credential | 401 `AUTH_REFRESH_REQUIRED` | Eligible for coordinated recovery, including one initial recovery attempt when no session exists |
| Invalid signature/purpose or revoked session | 401 `AUTH_SESSION_INVALID` | Stop recovery; clear local private state |
| Invalid/expired/replayed refresh | 401 `AUTH_REFRESH_INVALID` | Stop recovery; coordinated refresh endpoint clears applicable cookies |
| Invalid/used/expired reset token | 400 `RESET_TOKEN_INVALID` | Offer a new reset request |
| Permission or Origin/header failure | 403 `FORBIDDEN` / `CSRF_REJECTED` | No refresh |
| Rate limit | 429 `RATE_LIMITED`, Retry-After | Show bounded retry guidance; no auth refresh |
| Unexpected service failure | 500 or 503 `INTERNAL_ERROR` / `SERVICE_UNAVAILABLE` | Show unavailable state; do not assume logout |

The read-only session probe never validates/consumes refresh tokens. Missing access may therefore result in one failed refresh for an anonymous browser, after which state becomes anonymous. This avoids extra server complexity to prove refresh eligibility in every probe. Ordinary protected requests must not set/clear cookies on 401, which could overwrite cookies from a later login/refresh response.

Login/refresh/session responses and other personalized responses use private/no-store cache rules. Refresh calls use the raw auth transport, never the auto-recovering API wrapper. The frontend uses a shared promise, Web Lock, and post-lock session recheck; each original request retries at most once. Do not automatically retry a refresh with an uncertain outcome.

## Initial abuse limits

Selected initial limits for one backend instance; use rolling windows or an equivalent documented limiter. Tune using evidence rather than adding permanent account lockouts.

| Endpoint | Initial limit |
| --- | --- |
| Registration | 5 attempts / IP / hour |
| Login | 20 attempts / IP / 15 minutes and 10 failures / normalized-email digest / 15 minutes |
| Forgot password | 5 attempts / IP / 15 minutes; at most one email per account per 60 seconds, silently suppressed with the same generic response |
| Reset password | 10 attempts / IP / 15 minutes |
| Refresh | 60 attempts / IP / minute and 10 rotations / session / minute |

Resolve client IP only from explicitly trusted proxies; never trust arbitrary forwarded headers. No per-account rate-limit response may disclose whether an account exists. Before multiple replicas, select shared enforcement at the trusted edge or database and test it. In-memory limits are not represented as fleet-wide protection. Do not add Redis for an assumed future topology.

## Browser transport and configuration

Production: one HTTPS public origin serving the frontend and proxying `/api` to Nest. Preserve individual Set-Cookie headers and validate the trusted public Origin. The frontend API base is the relative `/api` path; it does not contain an upstream credential/secret.

Production cookies: `__Host-access` and `__Host-refresh`, Secure, HttpOnly, SameSite=Lax, Path=/, no Domain. Clear with the same identity attributes. Cookie expiry cannot exceed JWT/session expiry. For browser writes require a trusted Origin plus `X-Requested-With: practice`; body-bearing requests accept JSON only. Do not configure permissive credentialed CORS or allow state changes via GET.

For existing HTTP localhost development, select explicit development-only `practice_access`/`practice_refresh` names and `Secure=false`. Production configuration must reject that combination. Production-like cookie testing must use HTTPS before release; do not make local TLS setup a prerequisite for unrelated infrastructure verification.

| Variable | Contract / selected policy |
| --- | --- |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Required secret values, independent, sufficiently random; never frontend-exposed |
| `JWT_ISSUER`, `JWT_AUDIENCE` | Required nonempty identity strings used in signing and verification |
| `JWT_ACCESS_TTL_SECONDS` | Explicit 600 for initial policy |
| `AUTH_SESSION_TTL_SECONDS` | Explicit 604800; absolute deadline |
| `PASSWORD_RESET_TTL_SECONDS` | Explicit 1800 |
| `ARGON2_MEMORY_KIB`, `ARGON2_TIME_COST`, `ARGON2_PARALLELISM` | Explicit 19456, 2, 1 initially; positive bounded values |
| `AUTH_COOKIE_SECURE` | Strict boolean; must be true in production |
| `AUTH_ACCESS_COOKIE_NAME`, `AUTH_REFRESH_COOKIE_NAME` | Explicit names validated against production/development policy |
| `FRONTEND_ORIGIN` | Trusted exact origin, no path/query/fragment; development `http://localhost:3001`; production supplied later |
| `RESEND_API_KEY`, `RESEND_FROM` | Required for real email mode; protected secret and verified sender address/name |
| `EMAIL_DELIVERY_MODE` | Explicit `mock` in tests or `resend` for real delivery; mock prohibited in production |
| `API_PROXY_TARGET` | Server-side Vite/proxy configuration; local `http://localhost:3000`, production internal origin supplied later; never arbitrary user input |

Add these to the application/tool schemas and examples in their implementation phase, not as currently consumed configuration. Read deployment variables explicitly; no hidden Compose fallbacks. Do not add a JWT algorithm configuration knob: allowlist HS256 in the implementation.

Reset links use the trusted configured origin and fixed path `/reset-password#token=<encoded-token>` for the current CSR app. The fragment avoids sending the raw token in the page URL to servers. The reset page reads it once into memory, removes the fragment via history replacement, and sends the token only in the reset POST body. Do not log it, load analytics on that page, or persist it; a reload after removal may require reopening the email link. Set an appropriate no-referrer policy.

Resend failures retain the generic forgot-password response, produce safe operational logs, and never change the user's password. Do not claim delivery success in UI. If the provider outcome is uncertain, avoid blind resending. Test provider errors without real emails.

## Release follow-ups and handoff

| Item | Responsible party / phase | Gate |
| --- | --- | --- |
| Production public origin and hosting provider | User supplies destination; implementation agent configures in Phase 9 | Production packaging and browser smoke tests |
| Resend verified sender/domain and API key | User supplies through secure configuration; implementation agent verifies in Phases 3/9 when authorized | Real email integration/release |
| Signing keys and deployment secret storage | Implementation/deployment task in Phases 3/9 | Real authentication deployment |
| Argon2 benchmark | Implementation agent on representative runtime in Phases 3/9 | Capacity validation before release |
| Trusted proxy/client-IP and multi-instance limiter behavior | Deployment task once topology is known | Production rate-limit validation |
| Production-like HTTPS cookie and multi-tab tests | Phases 4/8/9 | Auth acceptance/release |

Phase 1 may now verify the existing infrastructure. Phase 2 implements the client pattern and later generates types from real backend OpenAPI schemas. Phase 3 implements this auth contract. These decisions do not authorize sending emails, altering deployed databases, or starting implementation beyond Phase 0.
