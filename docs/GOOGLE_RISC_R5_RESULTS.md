# Google RISC — R5 results (stream registration and staging smoke)

**Plan:** [GOOGLE_RISC_PHASED_PLAN.md](GOOGLE_RISC_PHASED_PLAN.md) § R5.  
**Runbook:** [GOOGLE_RISC_STREAM_SETUP.md](GOOGLE_RISC_STREAM_SETUP.md).

## Repository deliverables (complete)

| Item | Status |
| --- | --- |
| [GOOGLE_RISC_STREAM_SETUP.md](GOOGLE_RISC_STREAM_SETUP.md) | Complete |
| [PRODUCTION.md](../PRODUCTION.md) § Google RISC | Complete |
| `pnpm preflight:google-risc` | Complete |
| `pnpm sign:test-risc-set` | Complete (local/tunnel only) |

## Staging smoke (operator)

Complete this section after executing the staging playbook on a real HTTPS staging origin. Replace placeholders; do not paste secrets or full SETs.

| Field | Value |
| --- | --- |
| Date executed | _pending_ |
| Staging public origin | `https://<staging-origin>` |
| Delivery URL | `https://<staging-origin>/api/auth/google/risc` |
| Preflight (`pnpm preflight:google-risc`) | _pass / fail_ |
| `stream:update` | _redacted response summary (enabled, URL match)_ |
| `stream:verify` | _pass / fail_ |
| Functional event method | _verify only / app access revoke / other_ |

### Redacted receipt evidence

| `jti` (prefix or id) | `event_types` | `provider_subject` | `user_id` |
| --- | --- | --- | --- |
| _pending_ | _pending_ | _optional_ | _optional uuid_ |

### Session invalidation (if linked user)

| Check | Result |
| --- | --- |
| `GET /api/auth/session` after revoke event | _AUTH_SESSION_INVALID or refresh failure / N/A_ |

### Notes

- Casual Google tab sign-out without a RISC event still does **not** end Practice sessions ([GOOGLE_OAUTH_RESULTS.md](GOOGLE_OAUTH_RESULTS.md)).
- Production stream: **not** enabled until this staging section is signed off.

## Automated verification (repo)

| Command | Result (2026-11-18) |
| --- | --- |
| `pnpm test` | 162 tests passed (incl. RISC HTTP/controller/limiter) |
| `TEST_DATABASE_URL=…/_test pnpm test:google-risc-http:integration` | Run before staging cutover (POST → 202, revoke, 404 when off) |

Staging **Google** `stream:verify` and a real SET are not run in CI; complete the operator table above on your staging origin before enabling production RISC.

## Next

**R6** — [GOOGLE_RISC_RESULTS.md](GOOGLE_RISC_RESULTS.md) (rollup). **R7** — [GOOGLE_RISC_R7_RESULTS.md](GOOGLE_RISC_R7_RESULTS.md) (`pnpm verify:google-risc`).