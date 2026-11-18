# Google RISC — R4 results (HTTP controller and hardening)

**Date:** 2026-11-18  
**Plan:** [GOOGLE_RISC_PHASED_PLAN.md](GOOGLE_RISC_PHASED_PLAN.md) § R4.  
**Design lock:** [GOOGLE_RISC_A0_RESULTS.md](GOOGLE_RISC_A0_RESULTS.md).

## Delivered

| Area | Implementation |
| --- | --- |
| Raw body | [`configure-app.ts`](../src/configure-app.ts) — `text` parser (`8kb`) for `POST /auth/google/risc` only; other `/auth` routes stay JSON |
| Controller | [`google-risc.controller.ts`](../src/modules/auth/risc/google-risc.controller.ts) — `verifySet` → `handleVerifiedEvent` → **202** empty body |
| Rate limit | [`GoogleRiscLimiter`](../src/modules/auth/risc/google-risc-limiter.ts) + [`GoogleRiscRateLimitGuard`](../src/modules/auth/risc/google-risc-rate-limit.guard.ts) — not `AuthSecurityGuard` |
| HTTP mapping | [`google-risc-http.ts`](../src/modules/auth/risc/google-risc-http.ts) per A0 / R2 |
| Swagger | `@ApiTags('Internal webhooks')` + response matrix on receiver |

## HTTP status (locked)

| Condition | HTTP |
| --- | --- |
| `GOOGLE_RISC_ENABLED=false` | **404** |
| Empty / malformed SET | **400** (`RISC_SET_MALFORMED`, `RISC_SET_KEY_UNKNOWN`) |
| Invalid signature / claims | **401** (`RISC_SET_INVALID`) |
| Audience misconfiguration | **202** + error log (no handler) |
| Valid SET (all handler outcomes) | **202** |
| Rate limit | **429** (`RATE_LIMITED`, `Retry-After`) |
| JWKS / processing failure | **500** |
| Body &gt; 8KB | **413** (express text parser + `AuthErrorFilter`) |

## Rate limits (in-process)

| Bucket | Limit |
| --- | --- |
| Per IP | 120 / 60s |
| Global | 600 / 60s |

Constants: `GOOGLE_RISC_RATE_LIMIT_*` in [`google-risc.constants.ts`](../src/modules/auth/risc/google-risc.constants.ts).

## Manual curl (local, RISC enabled)

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST "http://127.0.0.1:3000/auth/google/risc" \
  -H 'Content-Type: application/secevent+jwt' \
  --data-binary @fixtures/set.jwt
```

No CSRF or `Origin` headers required.

## Verification

| Command | Expectation |
| --- | --- |
| `pnpm test` | Unit specs: `google-risc-http`, `google-risc.controller`, `google-risc-rate-limit.guard` |
| `TEST_DATABASE_URL=…/_test pnpm test:google-risc-http:integration` | HTTP 202 + revoke + 404 when disabled |
| `TEST_DATABASE_URL=…/_test pnpm test:google-risc-handle:integration` | Service layer still green |
| `pnpm build` | Pass |
| `pnpm api:check` | OpenAPI includes internal webhook tag |

## Next

**R5** — [GOOGLE_RISC_STREAM_SETUP.md](GOOGLE_RISC_STREAM_SETUP.md), `pnpm preflight:google-risc`, staging smoke evidence in [GOOGLE_RISC_R5_RESULTS.md](GOOGLE_RISC_R5_RESULTS.md).