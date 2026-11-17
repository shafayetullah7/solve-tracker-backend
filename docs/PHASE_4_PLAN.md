# Phase 4 — Frontend authentication execution plan

Status: **implementation complete** — Steps **4.1–4.8** documented ([PHASE_4_RESULTS.md](./PHASE_4_RESULTS.md)); **live** `pnpm verify:phase-4.7` remains the operator acceptance gate before release sign-off.

Outcome: users can register, log in, recover/reset passwords, reload authenticated pages, recover expired access, and log out through the real backend. Session recovery is coordinated across requests and tabs, and old-account responses cannot restore private UI state.

References: [Phase 0 contracts](PHASE_0_DECISIONS.md), [Phase 3 results](PHASE_3_RESULTS.md), [frontend conventions](../solve-tracker-frontend/FRONTEND_CONVENTIONS.md), [auth conventions](../solve-tracker-frontend/AUTH_CONVENTIONS.md), and [API client](../solve-tracker-frontend/API_CLIENT.md).

## 1. Scope and prerequisites

- Reuse the seven implemented auth endpoints, generated operation types, `createAuthApi`, and `createApiClient`. Do not add raw fetch to components or implement another backend/client framework.
- Preserve installed Solid 2.0.0-rc.21 and Vite Start-mode CSR. Verify the installed router's navigation/layout APIs before using unfamiliar patterns; do not copy Next.js, React, or Solid 1.x examples.
- Recheck backend configuration, migration state, and API drift. Production Resend remains unconfigured and Docker access was blocked in Phase 3. A dedicated native PostgreSQL instance plus the real Nest runtime is an acceptable local browser-test path; it does not verify Docker packaging.
- Only apply migrations to a known-safe target after inspecting it. Browser tests use isolated test accounts, not a developer's existing private library.
- No topic/problem CRUD, SSR/BFF, Redis, worker-based auth, social login, email verification, or new query/auth framework.
- Keep mock email confined to development/tests. Do not add a public reset-token endpoint or return recovery tokens in JSON just to make the UI testable.

## 2. Intended organization

```text
src/lib/auth/
  coordinator.ts                 # browser session recovery and mutation ordering
  context.tsx                    # per-root Solid provider and typed context
  forms.ts                       # reusable client-side validation/error mapping
src/lib/api/modules/auth.api.ts  # existing typed operations; no recursive recovery
src/components/auth/
  AuthLayout.tsx
  AuthField.tsx                  # only if shared field behavior needs extraction
  RequireSession.tsx
src/routes/
  login.tsx
  register.tsx
  forgot-password.tsx
  reset-password.tsx
  account.tsx                    # minimal protected session/account landing
```

Use the existing UI primitives/theme. The account landing provides a truthful signed-in identity/logout destination until product pages arrive; do not build a fake problem dashboard. Keep the UI foundation preview available as a development reference without making template users/navigation look like real account functionality.

## Step 4.1 — Verify endpoint and development-origin integration

- Confirm generated types match the current backend snapshot and auth API definitions.
- Run frontend and real backend through the same-origin `/api` proxy. Use the exact configured frontend origin (normally `http://localhost:3001`) for browser tests, not a hostname alias that correctly fails Origin validation.
- Verify login responses set both HttpOnly cookies, browser API requests carry them, and cookie values never enter client state.
- Verify registration has no login cookies, `/auth/session` is read-only, logout/reset return 204, and error codes distinguish recoverable access expiry from terminal failures.
- Capture pending Docker/production-only checks separately. Do not loosen Origin/CORS/cookie protection to make tests pass.

**Pass:** the real browser/proxy/backend cookie boundary works locally, or its exact prerequisite blocker is identified before UI success is claimed.

## Step 4.2 — Implement one browser coordinator

Create a small factory with injected typed auth API, lock/channel adapters where useful for testing, and callbacks for safe session state. Do not read browser globals at module import time.

- Own one in-flight session-recovery promise per browser app instance. Install it synchronously before awaiting network work; clear it safely in finally.
- Use one same-origin Web Lock name for refresh and session-changing operations. Inside the lock, probe the session again before any refresh: another tab may already have replaced the shared cookie.
- A valid probe returns the safe user immediately. Only the documented refresh-required error permits one raw refresh attempt. Other failures follow terminal/unavailable handling.
- Raw auth operations remain recovery-disabled. Wire the general API client's recovery callback to this coordinator, not the other way around.
- Track an auth epoch that changes on logout/account switching, not ordinary refresh. Reject stale responses through the existing client epoch hook and before publishing session state.
- A caller's canceled request stops its own retry, not recovery shared with other callers. Keep finite network/lock-wait handling; do not release a held lock merely because a request timed out while a response might still set cookies.
- After ambiguous refresh delivery, probe under coordination. Do not blindly repeat the refresh or loop. If valid updated state cannot be established, stop automatic recovery and provide an explicit sign-in/retry path.
- If Web Locks are unavailable, use the documented MVP behavior: no automatic refresh, clear explanation/sign-in on expiry. Do not substitute a localStorage timestamp or add a worker fallback.

**Pass:** unit tests with deterministic deferred promises cover shared recovery, lock recheck, bounded retry, errors, cancellation, and epoch changes. Browser tests later prove that separate tabs actually coordinate.

## Step 4.3 — Implement per-root reactive session state

- Provide a typed Solid context with `checking`, `authenticated`, `anonymous`, and `unavailable` states, safe user metadata, and explicit auth actions.
- Create provider state per application root. Do not export a global auth signal that could later leak across server requests.
- Bootstrap once in browser lifecycle using the installed `onSettled` contract with a once-per-provider guard; close channel/listeners on cleanup. Never bootstrap from JSX, route prefetch, or every route component.
- Read session through context in components. Use Show/Switch/Match and reactive props correctly; do not destructure props or assume component-body rerenders.
- Checking/unavailable states suppress private content. A network failure is not proof the user logged out.
- Return the normal typed API client from the composition boundary where future product modules need it. Keep product-data invalidation separate from auth refresh.

**Pass:** bootstrap happens once, state transitions are deterministic, private content does not flash, and provider cleanup leaves no listeners/timers behind.

## Step 4.4 — Build auth screens in a vertical sequence

### Registration

- Name, email, password only; visible labels, password policy, autocomplete hints, and accessible field errors.
- Match backend normalization and Unicode code-point limits. Server validation remains authoritative; map safe backend field details to controls.
- Prevent duplicate submissions; preserve name/email on failure and avoid persisting passwords.
- On success, show account-created feedback and navigate to login. Do not silently log in or imply email ownership is verified.

### Login and minimal protected landing

- Submit through the provider/typed API, serialize session mutation with the shared lock, and publish safe user metadata only for the current epoch.
- Show a generic credential error; distinguish rate limits and unavailable service from incorrect passwords.
- On success, navigate to a safe internal destination. Validate any return URL against the application's own allowed paths; never follow external/protocol-relative return URLs.
- Build a minimal signed-in account/session landing showing the user's name/email and working logout. Do not claim problems or progress exist yet.

### Forgot password

- Email input, pending/error states, and the backend's generic accepted message for every eligible outcome.
- Do not say the account exists or that the message was delivered. Avoid revealing cooldown/account/provider state.

### Reset password

- Read the fragment token in browser lifecycle once, hold it only in memory, and remove it from the URL using history replacement. Preserve unrelated URL handling appropriately.
- Submit the token/new password through the typed API. Add password confirmation for this screen only if helpful; it is not a registration field.
- Missing/expired/used tokens show a clear request-new-link path. A reload after fragment removal may require reopening the email link; explain this without persisting the token.
- Do not log tokens, expose them in analytics, or leave them in redirect URLs. Set an appropriate referrer policy for this route/document and keep third-party tracking off it.
- On success, invalidate local/cross-tab session UI, clear private state, and direct to login. Backend revocation remains authoritative.

**Pass:** each screen works against the real endpoint, handles safe validation/unavailable states, and is keyboard/mobile accessible.

## Step 4.5 — Add route gating and safe navigation

- Compose the auth provider and router without replacing the installed file-routing system.
- Gate protected routes through RequireSession. Render pending/unavailable views before making redirect decisions; only known-anonymous state goes to login.
- Registration/login/recovery remain public. Do not accidentally redirect authenticated users away from a password-reset link that must still be handled.
- Use generated paths helpers and the installed router's verified navigation mechanism. Avoid hardcoded nonexistent route APIs or Next middleware.
- Route guarding is UI behavior only; backend guard/ownership enforcement is unchanged.
- Do not fetch/refresh as a side effect of link preloading. Keep session bootstrap/recovery owned by the provider/coordinator.

**Pass:** direct protected navigation, reload, back/forward, auth pages, and local return paths behave correctly without redirect loops or private-content flashes.

## Step 4.6 — Handle cross-tab and account-change races

- Use BroadcastChannel only for safe `session-changed`/`logged-out` notifications, never JWTs, passwords, reset tokens, or user payloads.
- Treat messages as invalidation hints; probe for current session metadata rather than trusting another tab's identity claim. Avoid notification echo loops.
- On logout, increment local epoch and clear private UI immediately, then serialize server revocation and cookie clearing behind in-flight refresh. Do not let old responses restore the session.
- On receiving another tab's login/account-change notification, invalidate old state before fetching the new user's data. On logout notification, block automatic recovery until the server outcome is handled, so the receiver cannot recreate a session just before logout commits.
- If logout delivery fails, keep local private state cleared but show that server revocation is unconfirmed. Retry revocation explicitly; do not announce success or immediately bootstrap the old cookie back into authenticated state.
- Test reset-password invalidation across tabs and shared cookies, not just logout UI in one tab.

**Pass:** two tabs cannot rotate the same generation during normal recovery, revive a logged-out session, or show another account's stale cached results.

## Step 4.7 — Browser and automated verification

Add focused coordinator/provider/form tests, then real multi-tab browser tests against the actual backend and dedicated PostgreSQL. Use short test-only lifetimes through explicit test configuration; do not weaken production validation or alter normal development policy to accelerate tests.

For password-reset browser tests, capture the token only through a test-injected email provider/test harness isolated from production. No real Resend emails are sent automatically, and no test token-capture endpoint is added to the deployed application.

| Scenario | Required result |
| --- | --- |
| Register/login/logout | Registration does not sign in; login sets usable cookies; logout invalidates access |
| Reload/direct route | One bootstrap; private content waits; correct safe destination |
| Expired access, many requests | One coordinator recovery and at most one retry per request |
| Two tabs expire together | One rotation; waiting tab probes/reuses new cookie |
| Delayed old 401 | No second rotation after a fresh session exists |
| 403, wrong credentials, 429, network/5xx | No refresh loop; accurate UI state |
| Lost/aborted refresh response | Probe or explicit recovery; no blind rotating-token retry |
| Logout/login during recovery | Old responses/cookies cannot restore prior user state |
| Reset success/invalid/expired/reused | Correct flow; old sessions rejected; no token persistence |
| Unsupported locks | Explicit supported fallback, no false claim of cross-tab safety |
| Accessibility | Labels, error descriptions/live feedback, focus, Enter submission, mobile layout |
| Privacy | No credentials in browser storage, broadcast messages, HTML payloads, console logs, or generated artifacts |

Run frontend build, type/lint/tests, generated API drift checks, and affected backend checks if integration exposes a defect. Distinguish mocked transport tests from real browser/proxy/database evidence. Restore temporary edits/test policy, clean only test-owned data, and stop verification services unless intentionally handed off.

## Step 4.8 — Documentation and completion

During execution create `docs/PHASE_4_RESULTS.md`, recording implementation files, commands, route choices, real browser/multi-tab evidence, cookie/origin setup, and remaining production gates. Update frontend/auth/client documentation only where implemented behavior changed. Update execution-plan status based on evidence, not the existence of forms.

### Completion checklist

- [ ] Root auth provider and browser-safe coordinator exist and use the typed API.
- [ ] Registration, login, forgot/reset, protected landing, and logout work end to end.
- [ ] Checking/unavailable/anonymous/authenticated states and safe redirects are verified.
- [ ] Shared promise, Web Lock, post-lock probe, and one-retry policy prevent duplicate rotation.
- [ ] Multi-tab logout/reset/account-switch and late-response races pass browser tests.
- [ ] JWTs remain in HttpOnly cookies; reset tokens are transient and removed from the URL.
- [ ] Real proxy/cookie/CSRF behavior and unsupported-lock policy are tested.
- [ ] Meaningful component/coordinator/browser tests and build/type/lint/type-drift checks pass.
- [ ] Results separate local verification from Docker/production/live-email limitations.

If real multi-tab/backend tests cannot run, record the exact blocker and leave Phase 4 incomplete. Production Resend delivery and final hosting checks may remain documented release gates; they must not be represented as completed by mocked email tests.
