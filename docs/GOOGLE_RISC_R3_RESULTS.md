# Google RISC — R3 results (event handling and session revocation)

**Date:** 2026-11-18  
**Plan:** [GOOGLE_RISC_PHASED_PLAN.md](GOOGLE_RISC_PHASED_PLAN.md) § R3.  
**Design lock:** [GOOGLE_RISC_A0_RESULTS.md](GOOGLE_RISC_A0_RESULTS.md).

## Delivered

| Area | Implementation |
| --- | --- |
| Session revoke helper | `AuthService.revokeAllSessionsForUser(userId, auditReason, tx?)` — used by password reset, change-password, and RISC |
| Event handler | `GoogleRiscService.handleVerifiedEvent(VerifiedRiscEvent)` → `RiscHandleOutcome` |
| Idempotency | `jti` in `risc_event_receipts`; fast path + in-transaction re-check; unique violation → `duplicate` |
| TTL purge | `deleteReceivedBefore` on each new event (purge-on-insert) |
| Subscribed events | Filter `GOOGLE_RISC_SUBSCRIBED_EVENT_TYPES`; unknown keys ignored |
| Orphans | Receipt inserted with `user_id` null when no `sub` or no linked identity |
| `account-disabled` | Hybrid ops logging (`hijacking` → error; otherwise warn); always revoke when matched |
| Module cycle | `forwardRef` between `AuthModule` and `GoogleRiscModule` |
| Controller | Unchanged **501** when RISC enabled (HTTP in R4) |

## Outcomes

| `status` | Behavior |
| --- | --- |
| `duplicate` | Existing `jti`; no purge/revoke |
| `noop` | No subscribed event types; receipt with empty `event_types` |
| `orphan` | Subscribed event but no Practice user; receipt for audit |
| `revoked` | All `auth_sessions` for linked user updated |

Receipt insert and session revoke run in **one database transaction**.

## Verification

| Command | Expectation |
| --- | --- |
| `pnpm test` | Unit tests including `google-risc-handle.spec.ts` |
| `pnpm test:auth:integration` | Reset/change-password still revoke sessions via shared helper |
| `TEST_DATABASE_URL=postgresql://…/_test pnpm test:google-risc-handle:integration` | SET verify → handle → `revoked_at` + receipt + duplicate |
| `pnpm build` | Nest resolves `forwardRef` cycle |

## Next

**R4** — raw JWT body, controller **202**, rate limits, error → HTTP mapping. See [GOOGLE_RISC_PHASED_PLAN.md](GOOGLE_RISC_PHASED_PLAN.md) § R4.