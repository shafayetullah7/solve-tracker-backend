# GOOGLE-AUTH G2 — Google OAuth service (core) (results)

**Status:** complete (2026-11-18).  
**Plan:** [GOOGLE_OAUTH_PHASED_PLAN.md](GOOGLE_OAUTH_PHASED_PLAN.md) § G2.

## Services

| Service | Role |
| --- | --- |
| `OAuthStateService` | PKCE verifier + cryptographic `state`; signed HttpOnly cookie (`practice_google_oauth`); HMAC via `JWT_REFRESH_SECRET` |
| `GoogleOAuthService` | Authorize URL (S256 PKCE), token exchange, `id_token` verify → `VerifiedGoogleProfile` |
| `GoogleJwksCache` | OpenID discovery → `createRemoteJWKSet` with timeout/cache (5s / 1h) |

**Helpers:** `oauth-pkce.ts`, `oauth-return-path.ts`, `google-oauth.constants.ts`, `google-oauth.errors.ts`.

## Error codes

`OAUTH_DISABLED`, `OAUTH_STATE_INVALID`, `OAUTH_TOKEN_EXCHANGE_FAILED`, `OAUTH_ID_TOKEN_INVALID`, `OAUTH_EMAIL_UNVERIFIED`, `OAUTH_MISCONFIGURED` (`GoogleOAuthError`).

## Security notes

- PKCE `S256`; state compared with `timingSafeEqual`
- `id_token`: `RS256`, issuers `https://accounts.google.com` / `accounts.google.com`, `aud` = client id, `email_verified` required
- No logging of codes, secrets, or tokens
- Default scopes: `openid email profile`; state TTL default **600s** when env unset

## Tests

| File | Coverage |
| --- | --- |
| `oauth-pkce.spec.ts` | Verifier/challenge |
| `oauth-state.service.spec.ts` | Cookie round-trip, state mismatch, expiry |
| `google-oauth.service.spec.ts` | Authorize URL, mocked token exchange, local JWKS id_token cases |

**Command:** `pnpm test` — 129 tests pass.

## G3 handoff

| Route | G2 usage |
| --- | --- |
| `GET /auth/google` | `OAuthStateService.createStart`, `GoogleOAuthService.buildAuthorizationUrl`, Set-Cookie |
| `GET /auth/google/callback` | `validateCallback`, `exchangeCodeForIdToken`, `verifyIdToken` → then `AuthService` (G3) |
| Disabled | `GoogleOAuthService.isEnabled()` → 404 |

## Next phase

**G3** — complete; see [GOOGLE_OAUTH_G3_RESULTS.md](GOOGLE_OAUTH_G3_RESULTS.md). **G4** — frontend.