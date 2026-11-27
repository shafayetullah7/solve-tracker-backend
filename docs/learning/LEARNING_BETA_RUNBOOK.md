# Learning guides — beta rollout runbook

**Audience:** Operators staging or widening the private learning beta.  
**Gates:** `node scripts/verify-learning-7h.mjs` ([LEARNING_7H_RESULTS.md](./LEARNING_7H_RESULTS.md)).  
**Feedback:** [LEARNING_BETA_FEEDBACK.md](./LEARNING_BETA_FEEDBACK.md).

## 1. Prerequisites

| Step | Action |
|------|--------|
| Automated gate | `export TEST_DATABASE_URL=postgresql://…/practice_tracker_test` then `pnpm build` (backend) and `node scripts/verify-learning-7g.mjs` (or cumulative **7h** after 7H lands) |
| Schema | `pnpm db:migrate` on target database ([LEARNING_7D_RESULTS.md](./LEARNING_7D_RESULTS.md)) |
| Backend flag | **None** — learning APIs ship with migrations ([PRODUCTION.md](../../PRODUCTION.md)) |
| Recovery | `node scripts/rehearse-learning-migration-upgrade.mjs` on rehearsal DB when client tools on PATH |

## 2. Staging (flag on)

1. Deploy backend; confirm `GET /health` and `GET /health/ready` return 200 with `Cache-Control: no-store` ([LEARNING_7F_RESULTS.md](./LEARNING_7F_RESULTS.md)).
2. Frontend build environment:
   - `VITE_LEARNING_GUIDES_ENABLED=true` (required)
   - `VITE_PUBLIC_SITE_URL=<staging origin>`
   - Optional: `VITE_BETA_FEEDBACK_URL=https://…` or `mailto:…`
3. `pnpm build` in **solve-tracker-frontend**; deploy static/SSR artifact after backend is live.
4. Optional fixture (staging only): `tsx scripts/seed-learning-e2e.ts` — treat printed password as **staging-only**; rotate or delete user after smoke.

Details: [solve-tracker-frontend/docs/DEPLOY.md](../../../solve-tracker-frontend/docs/DEPLOY.md).

## 3. Pre-beta production

| Layer | Policy |
|-------|--------|
| Database | Apply same learning migrations as staging |
| Frontend build | Default `VITE_LEARNING_GUIDES_ENABLED=false` — practice-only UI |
| APIs | Learning endpoints exist but are unused without UI |

Existing production users see **no** learning nav until you ship a flag-`true` build to a cohort.

## 4. Beta cohort widen

Per [LEARNING_7_DECISIONS.md](./LEARNING_7_DECISIONS.md):

- Cohort = **named users** (invite list outside the app).
- Widen = rebuild and deploy frontend with `VITE_LEARNING_GUIDES_ENABLED=true`.
- **No runtime toggle** — plan a rebuild to roll back UI.

## 5. Smoke paths (staging or prod beta)

Run signed-in on the target origin:

1. `GET /health/ready` (or operator probe) — ready.
2. Sign in (or use seeded staging user).
3. `/app` — welcome / continue learning visible when flag on.
4. `/app/learning` — list loads; create or open a guide.
5. Study one step (content renders).
6. Guide overview — export JSON; confirm export scope copy (7G).
7. `/app/problems` — coding library still works (mixed product).
8. **Do not** run account erasure on non-disposable prod accounts.

Flag-off control: deploy a flag-`false` build or use Vitest / [LEARNING_6F_VERIFICATION_MATRIX.md](./LEARNING_6F_VERIFICATION_MATRIX.md) FLAG rows.

## 6. Rollback

| Symptom | Action |
|---------|--------|
| UI regression | Redeploy **previous frontend** build with flag `false` |
| API regression | Redeploy previous **backend** image |
| Schema issue | **Roll forward** with a fix migration — do not drop learning tables ([LEARNING_7D_RESULTS.md](./LEARNING_7D_RESULTS.md)) |

## 7. Blockers and feedback

- Log issues using [LEARNING_BETA_FEEDBACK.md](./LEARNING_BETA_FEEDBACK.md).
- Triage P0–P2 in [LEARNING_BETA_BLOCKERS.md](./LEARNING_BETA_BLOCKERS.md) (or §Blockers in [LEARNING_7H_RESULTS.md](./LEARNING_7H_RESULTS.md)).
- **P0** (security, data loss, auth bypass) blocks widening until fixed.

## 8. Optional operator gates

```text
# Default CI slice exit (no extra frontend builds)
node scripts/verify-learning-7h.mjs

# Signoff recording: dual build-time flag audit
BETA_FLAG_BUILD=1 node scripts/verify-learning-7h.mjs

# Manual smoke reminder (no HTTP)
BETA_LIVE=1 node scripts/verify-learning-7h.mjs
```