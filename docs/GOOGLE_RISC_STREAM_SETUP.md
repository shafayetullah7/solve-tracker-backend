# Google RISC — stream registration and smoke (runbook)

**Audience:** deployers / platform ops.  
**Prerequisites:** R4 receiver deployed; [GOOGLE_RISC_A0_RESULTS.md](GOOGLE_RISC_A0_RESULTS.md), [GOOGLE_RISC_R4_RESULTS.md](GOOGLE_RISC_R4_RESULTS.md).  
**Evidence:** record outcomes in [GOOGLE_RISC_R5_RESULTS.md](GOOGLE_RISC_R5_RESULTS.md).

Do **not** commit access tokens, client secrets, or SET bodies.

---

## 1. URLs and environment

| Layer | Path |
| --- | --- |
| Public delivery (Google POST) | `https://<public-origin>/api/auth/google/risc` |
| Nest (after edge strips `/api`) | `POST /auth/google/risc` |

`<public-origin>` is the browser origin (`FRONTEND_ORIGIN`): staging and production each need their **own** delivery URL and stream configuration.

### Environment (when RISC is on)

| Variable | Notes |
| --- | --- |
| `GOOGLE_RISC_ENABLED` | `true` on the target environment **after** endpoint preflight passes |
| `GOOGLE_OAUTH_ENABLED` | Must be `true` |
| `GOOGLE_OAUTH_CLIENT_ID` | Primary JWT `aud` for SET validation |
| `GOOGLE_RISC_AUDIENCE` | Set only if Google assigns a receiver id different from the OAuth client id |
| `GOOGLE_RISC_EVENT_TTL_SECONDS` | Optional; default 30 days receipt retention |

Run preflight before registration:

```bash
RISC_PUBLIC_URL="https://<staging-origin>/api/auth/google/risc" \
  pnpm preflight:google-risc
```

With RISC enabled, empty POST must return **400** (not 404). With RISC disabled, **404**.

---

## 2. Google Cloud (one-time per project)

1. Use the **same GCP project** as the GOOGLE-AUTH OAuth 2.0 Web client.
2. Enable the **RISC API** and accept the [RISC Terms of Service](https://developers.google.com/identity/protocols/risc).
3. Confirm the OAuth client id matches `GOOGLE_OAUTH_CLIENT_ID` in that environment.

Official reference: [Configure your RISC stream](https://developers.google.com/identity/protocols/risc#configure-your-stream).

---

## 3. Subscribed event types

Use these URIs exactly (also defined in `GOOGLE_RISC_SUBSCRIBED_EVENT_TYPES` in code):

```json
[
  "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
  "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked",
  "https://schemas.openid.net/secevent/risc/event-type/account-disabled"
]
```

---

## 4. `stream:update`

Obtain a bearer token with permission to manage the RISC stream (for example, an OAuth access token for a project member with RISC configuration access):

```bash
export RISC_ACCESS_TOKEN="$(gcloud auth print-access-token)"
export DELIVERY_URL="https://<staging-origin>/api/auth/google/risc"
```

Example update (adjust `DELIVERY_URL` per environment):

```bash
curl -sS -X POST "https://risc.googleapis.com/v1beta/stream:update" \
  -H "Authorization: Bearer ${RISC_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"delivery\": {
      \"delivery_method\": \"https://schemas.openid.net/secevent/risc/delivery-method/push\",
      \"url\": \"${DELIVERY_URL}\"
    },
    \"events_requested\": [
      \"https://schemas.openid.net/secevent/risc/event-type/sessions-revoked\",
      \"https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked\",
      \"https://schemas.openid.net/secevent/risc/event-type/account-disabled\"
    ],
    \"status\": \"enabled\"
  }"
```

Check stream state:

```bash
curl -sS -X POST "https://risc.googleapis.com/v1beta/stream:status" \
  -H "Authorization: Bearer ${RISC_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Redact tokens when saving responses to [GOOGLE_RISC_R5_RESULTS.md](GOOGLE_RISC_R5_RESULTS.md).

If Google's configuration documents a **receiver id** that does not match `GOOGLE_OAUTH_CLIENT_ID`, set `GOOGLE_RISC_AUDIENCE` to that value, redeploy, and re-run `stream:verify`. Until fixed, valid SETs may return **202** with audience-mismatch error logs and **no** session revoke.

---

## 5. `stream:verify`

After `stream:update` points at the live HTTPS endpoint:

```bash
curl -sS -X POST "https://risc.googleapis.com/v1beta/stream:verify" \
  -H "Authorization: Bearer ${RISC_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Google sends a verification Security Event Token to `DELIVERY_URL`.

**Success criteria for Practice:**

- HTTP **202** from `POST /api/auth/google/risc`
- Ops log from `GoogleRiscController` (no full SET in logs)
- Optional row in `risc_event_receipts` (verify payloads may be **noop** — still acceptable)

---

## 6. Staging smoke playbook

### Phase A — Deploy readiness

1. Deploy backend with R4 and run `pnpm db:migrate`.
2. Set `GOOGLE_RISC_ENABLED=true` on staging (OAuth already enabled).
3. `pnpm preflight:google-risc` against staging public URL.
4. Confirm edge proxies `/api/*` to Nest (same as OAuth callback).

### Phase B — Register stream

1. Run §4 and §5 for **staging** `DELIVERY_URL` only.
2. Archive redacted `stream:status` / verify responses in R5 results.

### Phase C — At least one real security event

Choose one (or more):

| Method | What to do | Evidence |
| --- | --- | --- |
| **Verify only** | `stream:verify` | `jti` in receipts or logs; HTTP 202 |
| **Revoke app access** | Staging user signed in with Google → Google Account → remove app access | `sessions-revoked` / `tokens-revoked`; `user_id` on receipt; `auth_sessions.revoked_at` |
| **Orphan** | Event for Google `sub` with no Practice link | Receipt with `user_id` null; still **202** |

**Session check:** After a revoke for a linked user, `GET /api/auth/session` with former cookies should fail (`AUTH_SESSION_INVALID` or refresh failure).

### Phase D — SQL evidence (redacted)

```sql
SELECT jti, received_at, event_types, provider_subject, user_id
FROM risc_event_receipts
ORDER BY received_at DESC
LIMIT 5;
```

Paste one row (ids only, no SET) into [GOOGLE_RISC_R5_RESULTS.md](GOOGLE_RISC_R5_RESULTS.md).

---

## 7. Appendix — local / tunnel (no staging)

Google requires **HTTPS** for production stream URLs. For ad-hoc developer testing:

1. Expose HTTPS via cloudflared, ngrok, or similar.
2. If the tunnel terminates on the **frontend** origin, delivery URL is `https://<tunnel-host>/api/auth/google/risc`.
3. If the tunnel points **directly at Nest**, use `https://<tunnel-host>/auth/google/risc` and ensure Google registration uses that exact URL (unusual; prefer frontend + `/api` proxy).
4. Run **temporary** `stream:update` with the tunnel URL; run `stream:verify`.
5. **Disable** the stream and stop the tunnel when finished.

Local crypto-only test (no Google):

```bash
pnpm sign:test-risc-set | curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST "http://127.0.0.1:3000/auth/google/risc" \
  -H 'Content-Type: application/secevent+jwt' \
  --data-binary @-
```

Requires local Nest with `GOOGLE_RISC_ENABLED=true` and test JWKS override — **not** a substitute for `stream:verify`.

---

## 8. Rollback

| Step | Effect |
| --- | --- |
| `stream:update` with `"status": "disabled"` | Google stops delivery |
| `GOOGLE_RISC_ENABLED=false` + redeploy | Webhook **404**; OAuth unchanged |
| See [PRODUCTION.md](../PRODUCTION.md) | OAuth rollback |

---

## 9. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Verify never completes / Google retries | **404** (RISC off), **401** (invalid SET), **413** (body > 8KB), edge rewriting body as JSON |
| **202** but no session revoke | Orphan `sub`; user not linked via Google on that env |
| Error log: audience mismatch | Set `GOOGLE_RISC_AUDIENCE` and redeploy |
| **429** | Rate limit; wait `Retry-After` ([R4 limits](GOOGLE_RISC_R4_RESULTS.md)) |
| WAF blocks POST | Allow `POST /api/auth/google/risc` from Google egress |

---

## 10. Production cutover

1. Complete staging evidence in [GOOGLE_RISC_R5_RESULTS.md](GOOGLE_RISC_R5_RESULTS.md).
2. Register a **separate** stream (or delivery URL) for production.
3. Enable `GOOGLE_RISC_ENABLED=true` on production only after preflight + `stream:verify` on prod URL.
4. Do **not** point production at staging URLs.