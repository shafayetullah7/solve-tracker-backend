# GOOGLE-RISC R2 — SET validation (results)

**Status:** complete (2026-11-18).  
**Plan:** [GOOGLE_RISC_PHASED_PLAN.md](GOOGLE_RISC_PHASED_PLAN.md) § R2.

## Deliverables

| Piece | Path |
| --- | --- |
| Constants + issuers + event types | `src/modules/auth/risc/google-risc.constants.ts` |
| Types | `src/modules/auth/risc/google-risc.types.ts` |
| Zod payload | `src/modules/auth/risc/google-risc.schema.ts` |
| Errors | `src/modules/auth/risc/google-risc.errors.ts` |
| JWKS cache | `src/modules/auth/risc/google-risc-jwks.cache.ts` (RISC well-known, not OAuth OpenID) |
| Verify API | `GoogleRiscService.verifySet(rawBody, keySetOverride?)` → `VerifiedRiscEvent` |

## Error codes (HTTP mapping in R4)

| Code | Intended HTTP |
| --- | --- |
| `RISC_DISABLED` | N/A (caller should gate) |
| `RISC_SET_MALFORMED` | 400 |
| `RISC_SET_KEY_UNKNOWN` | 400 |
| `RISC_SET_INVALID` | 401 |
| `RISC_SET_AUDIENCE_MISMATCH` | 202 + error log |
| `RISC_JWKS_UNAVAILABLE` | 500 |

## Verification behavior

- RS256, `GOOGLE_RISC_ISSUERS`, audience from `GOOGLE_RISC_AUDIENCE` or `GOOGLE_OAUTH_CLIENT_ID`
- Historical SETs: large `clockTolerance` — **expired `exp` still verifies**
- Parses `events` with `iss-sub` → `subjectSub` on each entry
- `parseGoogleAccountSub` helper on verified entries (R3)

## HTTP controller

`POST /auth/google/risc` remains **501** when enabled (no `verifySet` wire-up until R4).

## Tests

`google-risc.service.spec.ts`: configuration, malformed, valid SET, wrong aud, bad signature, expired exp, disabled flag.

| Command | Result |
| --- | --- |
| `pnpm test` | 141 tests pass |
| `pnpm build` | Pass |

## Next phase

**R3** — `AuthService.revokeAllSessionsForUser`, `handleVerifiedEvent`, idempotency receipts. See phased plan § R3.