# Auth module layout

| Path | Contents |
| --- | --- |
| Root | Core HTTP auth: controller, service, repository, JWT/cookies, guards, password, filters |
| `schemas/` | Zod request/response schemas |
| `google/` | Google OAuth (PKCE, state, identities, JWKS) |
| `risc/` | Cross-Account Protection: JWKS cache, SET `verifySet` + `handleVerifiedEvent`, `POST /auth/google/risc` (202) — [GOOGLE_RISC_RESULTS.md](../../../docs/GOOGLE_RISC_RESULTS.md) |

Other features import guards from the root (`access.guard`, `auth-security.guard`). `AuthModule` re-exports providers for the rest of the app.