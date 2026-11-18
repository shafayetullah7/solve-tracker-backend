# Google OAuth — reference and acceptance

Rollup for **GOOGLE-AUTH** (G0–G7). Phase-by-phase detail lives in `GOOGLE_OAUTH_G*_RESULTS.md` and [GOOGLE_OAUTH_PHASED_PLAN.md](GOOGLE_OAUTH_PHASED_PLAN.md).

## Summary

| Topic | Decision |
| --- | --- |
| Integration | Backend authorization code + PKCE; thin `GoogleOAuthService`; **no** Passport |
| Session | Same HttpOnly JWT cookies and `auth_sessions` as password login |
| Login linking | **Auto-link** on verified Google email when local user exists ([GOOGLE_OAUTH_A0_RESULTS.md](GOOGLE_OAUTH_A0_RESULTS.md)) |
| Profile linking | `GET /auth/google?mode=link` attaches `sub` to signed-in user only ([GOOGLE_OAUTH_G5_RESULTS.md](GOOGLE_OAUTH_G5_RESULTS.md)) |
| Google-only users | Allowed; `POST /auth/set-password` before password login or unlink |
| Feature gate | `GOOGLE_OAUTH_ENABLED=false` → OAuth routes **404**, UI hidden |
| Google vs Practice logout | Independent for casual Google sign-out; optional **RISC** when the server has Cross-Account Protection — [GOOGLE_RISC_RESULTS.md](GOOGLE_RISC_RESULTS.md) |

**Product note:** Signing out of Google in your browser does not sign you out of Practice. Use Practice **Sign out** to end your session. When Cross-Account Protection is enabled on the server, Google may end your Practice session after you revoke app access or certain account security events.

## Documented JSON API (`openapi.json`)

Password and session routes are in OpenAPI. Run `pnpm api:export` (backend) and `pnpm api:generate` (frontend) after auth schema changes.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/auth/session` | Returns `user` + `account.googleLinked`, `account.hasPassword` |
| `POST` | `/auth/set-password` | Google-only initial password; session retained |
| … | register, login, refresh, logout, forgot, reset, change-password | Unchanged from Phase 3 |

## OAuth redirect routes (not in OpenAPI)

Browser navigation and `302` redirects; excluded from generated client types (`@ApiExcludeEndpoint`).

| Method | Path | Auth | Query | Outcome |
| --- | --- | --- | --- | --- |
| `GET` | `/auth/google` | Public; **link:** valid access cookie | `next` (safe path), optional `mode=link` | `302` to Google; sets signed state cookie + PKCE |
| `GET` | `/auth/google/callback` | State cookie | `code`, `state` | Login: exchange code, set Practice cookies, `302` to `next` or `/app`. Link: `302` to `/app/profile?google_linked=1` or `oauth_error` |
| `DELETE` | `/auth/google/link` | Access JWT + CSRF headers | — | `204` unlink (requires password) |

**Errors:** Login/register → `/login?oauth_error=<code>`. Profile link → `/app/profile?oauth_error=<code>`. Map codes in frontend `oauth-error-copy.ts`.

**Proxy:** Browser hits same-origin `/api/auth/google*`; edge forwards to Nest. Callback is never an SPA route.

## Operations

- **Local:** See [`.env.example`](../.env.example) and `VITE_GOOGLE_OAUTH_ENABLED` in frontend `.env.example`.
- **Production:** [PRODUCTION.md](../PRODUCTION.md) § Google OAuth.
- **Optional RISC:** [GOOGLE_RISC_RESULTS.md](GOOGLE_RISC_RESULTS.md), stream setup [GOOGLE_RISC_STREAM_SETUP.md](GOOGLE_RISC_STREAM_SETUP.md).
- **Rollback:** `GOOGLE_OAUTH_ENABLED=false` (+ rebuild frontend flag); identity rows remain.

**Enable in an environment only when** `GOOGLE_OAUTH_*` credentials, redirect URI, and matching frontend build flag are complete.

## Automated regression

| Command | When | What it covers |
| --- | --- | --- |
| `pnpm verify:google-oauth` | CI / no DB | Env schema (disabled default), wiring, client greps, 404/302 HTTP smoke |
| `TEST_DATABASE_URL=…/_test pnpm verify:google-oauth:exit` | Pre-release | Above + identities + `test:google-oauth:*` + `api:check` + `verify:platform-api` |
| `TEST_DATABASE_URL=…/_test pnpm verify:phase-8` | Phase 8 umbrella | Includes Google exit + full monorepo regression |
| `pnpm verify:google-risc` / `verify:google-risc-exit` | Optional pre-release | Separate RISC gate; does not block OAuth CI ([GOOGLE_RISC_R7_RESULTS.md](GOOGLE_RISC_R7_RESULTS.md)) |

CI should keep `GOOGLE_OAUTH_ENABLED=false`; gates pass without Google Cloud secrets.

## Future notifications (not implemented)

Optional email when Google is first linked to an existing password account (G0 backlog). Suggested copy for a future Resend template:

- **Subject:** Google sign-in linked to your Practice account  
- **Body:** A Google account was linked to this email on Practice. If this was not you, change your password and unlink Google from Profile, or contact support.

Profile link (`mode=link`) may use the same template with “from your profile settings” wording.

## Manual acceptance checklist

Use on staging with real Google credentials only.

- [ ] `GOOGLE_OAUTH_ENABLED=true` and matching `VITE_GOOGLE_OAUTH_ENABLED` after rebuild.
- [ ] New user: Google → lands `/app`, session probe OK, library CRUD works.
- [ ] Existing password user: auto-link on verified email behaves per G0 matrix.
- [ ] Profile: link / set password / unlink flows (G5).
- [ ] Practice logout → protected routes require login; cookies cleared.
- [ ] Google-only browser logout → Practice still signed in until Practice logout.
- [ ] Password reset revokes Google-established sessions.
- [ ] Forged or expired OAuth `state` rejected.
- [ ] Rate limit on repeated OAuth starts.
- [ ] Production redirect URI and `FRONTEND_ORIGIN` match Google Cloud Console.
- [ ] With `GOOGLE_RISC_ENABLED=true` and stream registered: revoking app access (or verify handshake) ends Practice session on next API/refresh for linked users.

## Phase results index

| Phase | Doc |
| --- | --- |
| G0 Design | [GOOGLE_OAUTH_A0_RESULTS.md](GOOGLE_OAUTH_A0_RESULTS.md) |
| G1 Schema | [GOOGLE_OAUTH_G1_RESULTS.md](GOOGLE_OAUTH_G1_RESULTS.md) |
| G2 Services | [GOOGLE_OAUTH_G2_RESULTS.md](GOOGLE_OAUTH_G2_RESULTS.md) |
| G3 Controller | [GOOGLE_OAUTH_G3_RESULTS.md](GOOGLE_OAUTH_G3_RESULTS.md) |
| G4 Frontend login | [GOOGLE_OAUTH_G4_RESULTS.md](GOOGLE_OAUTH_G4_RESULTS.md) |
| G5 Profile link | [GOOGLE_OAUTH_G5_RESULTS.md](GOOGLE_OAUTH_G5_RESULTS.md) |
| G6 OpenAPI/ops | [GOOGLE_OAUTH_G6_RESULTS.md](GOOGLE_OAUTH_G6_RESULTS.md) |
| G7 Regression | [GOOGLE_OAUTH_G7_RESULTS.md](GOOGLE_OAUTH_G7_RESULTS.md) |