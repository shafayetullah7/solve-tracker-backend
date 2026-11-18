# GOOGLE-AUTH G1 — Schema and configuration (results)

**Status:** complete (2026-11-18).  
**Plan:** [GOOGLE_OAUTH_PHASED_PLAN.md](GOOGLE_OAUTH_PHASED_PLAN.md) § G1.

## Database

| Change | Detail |
| --- | --- |
| Migration | `drizzle/20261118062212_fantastic_shocker/migration.sql` |
| New table | `auth_provider_identities` — provider check (`google`), unique `(provider, provider_subject)`, unique `(user_id, provider)` |
| Alter | `users.password_hash` nullable (Google-only users) |
| Drizzle | `auth-provider-identities.table.ts`; `relations.ts` registry |

## Environment

| Variable | Notes |
| --- | --- |
| `GOOGLE_OAUTH_ENABLED` | `true` / `false`; default off in `.env.example` |
| `GOOGLE_OAUTH_CLIENT_ID` | Required when enabled |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Required when enabled |
| `GOOGLE_OAUTH_REDIRECT_URI` | Required when enabled; path must end with `/auth/google/callback`; HTTPS in production |
| `GOOGLE_OAUTH_SCOPES` | Optional (G2 default `openid email profile`) |
| `GOOGLE_OAUTH_PROMPT` | Optional |
| `GOOGLE_OAUTH_STATE_TTL_SECONDS` | Optional positive int |

Validation: `src/config/environment.ts` (`googleOAuthEnvironmentSchema` + `superRefine`).

## Repository

`AuthProviderIdentityRepository` (`src/modules/auth/auth-provider-identity.repository.ts`):

- `findByProviderSubject`, `findByUserAndProvider`, `listByUserId`
- `create`, `upsertByProviderSubject`, `deleteByUserAndProvider`
- Constant: `AUTH_PROVIDER_GOOGLE` in `auth-providers.ts`

Registered in `AuthModule` (providers + exports). No OAuth HTTP routes in G1.

## Verification

| Command | Result |
| --- | --- |
| `pnpm db:check` | Pass |
| `pnpm test` | 118 tests pass |
| `TEST_DATABASE_URL=…/_test pnpm test:auth-identities:integration` | 8 checks pass |
| `TEST_DATABASE_URL=…/_test pnpm test:auth:integration` | 38 assertions pass (OpenAPI auth path count updated to 8 for `/auth/change-password`) |

## Next phase

**G2** — complete; see [GOOGLE_OAUTH_G2_RESULTS.md](GOOGLE_OAUTH_G2_RESULTS.md). **G3** — controller + session issuance.