# Phase 7 — Public release hardening (slice plan)

**Branch:** `feature/learning-guides` (continued)  
**Prerequisite:** Phase 6 R1 complete ([LEARNING_6_PHASE_SIGNOFF.md](./LEARNING_6_PHASE_SIGNOFF.md)).  
**Objective (roadmap):** Safely release the integrated product to real users—hardening and beta rollout, not new learning product depth.

**Naming:** `scripts/verify-phase-7-exit.mjs` is the **legacy Practice MVP** gate. Learning Phase 7 uses **`LEARNING_7_*`** docs and any new scripts.

## Slice exit criteria

| Slice | Delivered | Signoff |
|-------|-----------|---------|
| **7.0** | Phase 6 gates green; launch decisions; audit A01–A15 → slice map | [LEARNING_7_0_RESULTS.md](./LEARNING_7_0_RESULTS.md) |
| **7A** | Auth, sanitization, URL/embed, quotas, rate limits, import abuse | [LEARNING_7A_RESULTS.md](./LEARNING_7A_RESULTS.md) |
| **7B** | Privacy regression: no learning leak via Discover/profile/public | [LEARNING_7B_RESULTS.md](./LEARNING_7B_RESULTS.md) |
| **7C** | Large-tree benchmarks; evidence-based indexes | [LEARNING_7C_RESULTS.md](./LEARNING_7C_RESULTS.md) |
| **7D** | Migration on representative data; backup/restore rehearsal | [LEARNING_7D_RESULTS.md](./LEARNING_7D_RESULTS.md) |
| **7E** | Full regression + Playwright smoke + a11y/browser matrix | [LEARNING_7E_RESULTS.md](./LEARNING_7E_RESULTS.md) |
| **7F** | Ops: health, safe logging, deployment limits | [LEARNING_7F_RESULTS.md](./LEARNING_7F_RESULTS.md) |
| **7G** | Export, deletion, privacy copy, feedback/abuse for beta | [LEARNING_7G_RESULTS.md](./LEARNING_7G_RESULTS.md) |
| **7H** | Beta flag rollout, feedback, blocker triage | [LEARNING_7H_RESULTS.md](./LEARNING_7H_RESULTS.md) |
| **7I** | Requirements §8 progress, phase signoff, `BASELINE_RUN` | [LEARNING_7_PHASE_SIGNOFF.md](./LEARNING_7_PHASE_SIGNOFF.md) |

**Phase exit criteria (roadmap):** No known critical security/data-loss/a11y blockers; baseline regression suite passes; recovery procedure tested; beta feedback reviewed.

**7A blocked until:** [LEARNING_7_0_RESULTS.md](./LEARNING_7_0_RESULTS.md).

---

## Design authority (read before 7.0)

| Doc | Use |
|-----|-----|
| [LEARNING_BASELINE_AUDIT.md](./LEARNING_BASELINE_AUDIT.md) | A01–A15 remediation owners |
| [SECURITY_RECOVERY_ARCHITECTURE.md](./SECURITY_RECOVERY_ARCHITECTURE.md) | Abuse limits, idempotency, recovery |
| [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md) | Benchmark targets and quotas |
| [LEARNING_6_PHASE_SIGNOFF.md](./LEARNING_6_PHASE_SIGNOFF.md) | Flag, deferrals, deployment |
| [LEARNING_6F_VERIFICATION_MATRIX.md](./LEARNING_6F_VERIFICATION_MATRIX.md) | Responsive manual matrix (7E) |

---

## Out of scope (Phase 7)

| Item | Where |
|------|--------|
| Public guide publishing, Discover guides | Phase 8 |
| AI, flashcards, banks, collaboration | Phase 8 |
| New block types, editor redesign | Phase 8 |
| Combined activity API | Phase 8+ |
| Mandatory flag removal for 7I | 7.0 / 7H decision only |

---

## 7.0 — Baseline and launch decisions

- Re-run Phase 6 cumulative gates; record counts in `BASELINE_RUN`.
- Publish [LEARNING_7_DECISIONS.md](./LEARNING_7_DECISIONS.md): dark mode in 7E vs post-beta; Playwright scope; beta cohort; performance budget adoption.
- Map open audit rows to slices (A15 → 7B, abuse → 7A, media → 7A/7G).

---

## 7A — Security and abuse

- Cross-account negatives on nested learning resources; CSRF on mutations.
- Content: `sanitizeTextBody`, safe URLs/embeds, CSP alignment ([A05](./LEARNING_BASELINE_AUDIT.md)).
- Rate/size/depth limits per [SECURITY_RECOVERY_ARCHITECTURE.md](./SECURITY_RECOVERY_ARCHITECTURE.md) §Abuse; import and heavy reads.

**Primary backend**; frontend only if renderer/CSP changes.

---

## 7B — Privacy regression

- Seed learning data; assert Discover, profile, share, and unauthenticated routes never expose private guides, notes, attempts, enrollments ([A15](./LEARNING_BASELINE_AUDIT.md)).
- Extend or add integration script (e.g. `test-learning-privacy-integration.mjs`).

---

## 7C — Performance

- Fixtures per [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md); stress tree to hierarchy limits.
- `EXPLAIN ANALYZE` on list, tree, progress, assessment history; indexes only with measured benefit.

---

## 7D — Migration and recovery

- Upgrade representative coding-only DB with learning migrations (idempotent ×2).
- Documented backup/restore drill; rollforward policy on `feature/learning-guides`.

---

## 7E — Regression, E2E, accessibility

- Cumulative: backend `test:e2e`, all integration scripts, `pnpm check`, `verify-phase-4.7.mjs`, `verify-ssr-2.mjs`.
- Playwright smoke: login → overview → learning library → study; flag-off control.
- Execute [LEARNING_6F_VERIFICATION_MATRIX.md](./LEARNING_6F_VERIFICATION_MATRIX.md); WCAG-oriented pass; dark mode only if 7.0 commits.

---

## 7F — Operations

- Health/readiness; no sensitive payloads in logs.
- Staging/production checklist (migrations + `VITE_LEARNING_GUIDES_ENABLED`).

---

## 7G — Data rights and policy

- Guide/account export and deletion behavior for learning rows.
- Privacy and beta disclosures; lightweight feedback/abuse channel.
- Update [LEARNING_REQUIREMENTS.md](./LEARNING_REQUIREMENTS.md) toward §8 release honesty.

---

## 7H — Beta rollout

- Staging flag on; production beta cohort via build-time flag.
- Runbook, feedback template, blocker triage before widening access.

---

## 7I — Signoff

- [LEARNING_7_PHASE_SIGNOFF.md](./LEARNING_7_PHASE_SIGNOFF.md); roadmap Phase 7 complete; refresh [BASELINE_RUN.md](./BASELINE_RUN.md).

---

## Suggested execution order

1. **7.0**  
2. **7A** + **7B** (parallel)  
3. **7C**  
4. **7D** (can start after 7.0)  
5. **7E**  
6. **7F** + **7G** (parallel)  
7. **7H**  
8. **7I**

---

## Gates (per slice, cumulative)

| Gate | Command |
|------|---------|
| Build/test backend | `pnpm build`, `pnpm test --run`, `pnpm test:e2e` |
| Build/test frontend | `pnpm check`, `pnpm build` |
| Learning integration | `node scripts/test-learning-integration.mjs` |
| Problems regression | `node scripts/test-problems-integration.mjs` |
| Topics regression | `node scripts/test-topics-integration.mjs` |
| Privacy (7B+) | learning privacy integration script |
| Contract | `pnpm api:check` when API touched |
| SSR/auth | `verify-phase-4.7.mjs`, `verify-ssr-2.mjs` |
| E2E (7E+) | Playwright smoke |
| Feature flag | Flag off/on Vitest + manual smoke |

---

## Roadmap mapping

| Roadmap bullet (Phase 7) | Slice |
|--------------------------|-------|
| Authorization, sanitization, quotas, rate limits, import abuse | 7A |
| Private data not in Discover/profile | 7B |
| Large trees, indexes, benchmarks | 7C |
| Migrations, backup/restore | 7D |
| Unit, integration, E2E, a11y, browsers | 7E |
| Metrics, logging, health, limits | 7F |
| Deletion, export, privacy, feedback | 7G |
| Beta flag rollout and feedback | 7H |
| Signoff and baseline | 7I |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Phase 7 feature creep | Out-of-scope table; defer to Phase 8 |
| Dark mode scope | 7.0 in/out; not implicit in 7I |
| MVP `verify-phase-7-exit` confusion | `LEARNING_7_*` naming only |
| Rate limits without Redis | Process-local + DB quotas; document multi-instance gap |
| Beta without ops | 7F before expanding 7H |

**After Phase 7:** Phase 8 extensions (usage-driven), not more hardening depth unless blockers reopen.