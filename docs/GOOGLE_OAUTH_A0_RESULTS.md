# GOOGLE-AUTH G0 — Design lock and requirements (results)

**Status:** complete (2026-11-18).  
**Plan:** [GOOGLE_OAUTH_PHASED_PLAN.md](GOOGLE_OAUTH_PHASED_PLAN.md) § G0.

## Locked decisions

| Decision | Locked value |
| --- | --- |
| Implementation style | Thin `GoogleOAuthService` (`fetch` to Google token endpoint + `jose` `jwtVerify` on `id_token`); **no** new Passport dependency ([PHASE_3_RESULTS.md](PHASE_3_RESULTS.md)) |
| Session contract | Same as password login: `auth_sessions`, `TokenService`, `AuthCookies`, `AccessGuard` unchanged |
| OAuth flow | Backend authorization-code + PKCE; browser callback via same-origin `/api/auth/google/callback` (frontend proxy → Nest) |
| Account linking | **Auto-link on verified email** (G0 sign-off): see behavioral matrix below |
| Google-only users | **Allowed** (`password_hash` nullable after G1); password login unavailable until user sets a password (optional Profile flow in G5) |
| Feature gate | `GOOGLE_OAUTH_ENABLED=false` disables OAuth routes and hides UI |
| Google vs Practice logout | Independent sessions ([GOOGLE_OAUTH_PHASED_PLAN.md](GOOGLE_OAUTH_PHASED_PLAN.md) §6): signing out of Google does **not** end Practice cookies/session |
| Security baseline | PKCE, cryptographic `state`, `id_token` validation (`iss`, `aud`, `exp`, `sub`, `email_verified`), rate limits, no Google tokens or JWT strings in browser JS or logs |

### Rejected alternative (documented, not selected)

**Strict linking:** do not auto-sign-in when local user exists with same email but no Google link — require password login first, then link in Profile. Rejected in G0 in favor of auto-link UX.

### Auto-link risk and mitigations

Linking by verified Google email allows takeover of **dormant password-only** accounts if an attacker controls a Google account with that verified email.

**Mitigations locked for implementation (G2–G3):**

- Require `email_verified === true` before any link or signup.
- Reject unverified Google emails with safe redirect to `/login?oauth_error=...`.
- Log link/sign-in outcomes (user id, provider, success/failure); never log codes or tokens.
- **Backlog (G5/G6, not G0):** optional email notification on first Google link to an existing password account.

### G3 behavioral matrix (linking policy)

| Condition | Action |
| --- | --- |
| `(provider, sub)` already linked | Establish session (login) |
| No linked `sub`, new verified email (no local user) | Create user (no password) + identity row + session |
| No linked `sub`, local user with same normalized email, `email_verified` | Upsert identity (auto-link) + establish session |
| Google email not verified | Reject; redirect login with `oauth_error` |
| `GOOGLE_OAUTH_ENABLED=false` | OAuth routes 404; UI hidden |

## Requirements touchpoints

- [REQUIREMENTS.md](../REQUIREMENTS.md) **FR-07** addendum: optional Google sign-in, same cookie/session contract, linking policy, Google-only accounts, OAuth security and rate limits, Google vs Practice logout.
- FR-08 unchanged in spirit: password reset still revokes all sessions; **forgot-password applies to Google-only users only after they set a password** (until then, sign-in remains Google-only).

## Environment placeholders

Variable names and defaults are defined in [GOOGLE_OAUTH_PHASED_PLAN.md](GOOGLE_OAUTH_PHASED_PLAN.md) §4.1.  
**G0 does not** add entries to `.env.example` — that is **G1** (Zod + migration).

## Google Cloud Console checklist (owner: deployer)

1. Create or select a GCP project; configure the **OAuth consent screen** (app name, user support email, scopes: `openid`, `email`, `profile`).
2. Create an **OAuth 2.0 Client ID** of type **Web application**.
3. **Authorized JavaScript origins:** `http://localhost:3001` (local); production HTTPS origin matching `FRONTEND_ORIGIN`.
4. **Authorized redirect URIs** (must match `GOOGLE_OAUTH_REDIRECT_URI` exactly):
   - Local: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://<public-origin>/api/auth/google/callback`
5. Store client id and secret in a secret store (not committed); map to `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`.
6. Redirect URI must be the **browser-facing** origin (frontend + `/api` proxy), not Nest `:3000` directly.
7. Keep `GOOGLE_OAUTH_ENABLED=false` until G3+ wiring is complete; then enable in staging with real credentials only.

## G0 non-deliverables

No database migration, no `GoogleOAuthService`, no auth controller routes, no frontend “Continue with Google” control.

## Next phase

**G1** — complete; see [GOOGLE_OAUTH_G1_RESULTS.md](GOOGLE_OAUTH_G1_RESULTS.md). **G2** — Google OAuth and state services.