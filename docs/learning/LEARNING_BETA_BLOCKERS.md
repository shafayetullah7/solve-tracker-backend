# Learning beta — blocker register

Use this register during the private beta. **Authoritative snapshot** for slice signoff: [LEARNING_7H_RESULTS.md](./LEARNING_7H_RESULTS.md) §Blockers.

## Severity

| Level | Meaning | Blocks widen? |
|-------|---------|---------------|
| **P0** | Security, data loss, auth bypass | Yes |
| **P1** | Core journey broken (create, study, assess, library) | Yes unless waived in writing |
| **P2** | Polish, copy, edge UX | No — track in backlog |

## Template row

| ID | Severity | Area | Summary | Found | Status | Owner | Reopen slice |
|----|----------|------|---------|-------|--------|-------|--------------|
| — | — | — | — | — | — | — | — |

**Status:** `open` | `fixed` | `waived` (require one-line rationale in 7H RESULTS).

## Reopen rules

- **P0 open** → stop cohort widen; fix in place or revert deploy.
- **P1 waived** → document in 7H/7I signoff who accepted risk.
- Reopen a closed slice (7A–7G) only when the blocker maps to that slice’s ownership in [LEARNING_7_0_BASELINE.md](./LEARNING_7_0_BASELINE.md).