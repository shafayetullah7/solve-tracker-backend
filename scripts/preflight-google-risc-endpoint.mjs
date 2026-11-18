#!/usr/bin/env node
/**
 * GOOGLE-RISC R5 — public endpoint preflight (no Google API calls).
 *
 * Usage:
 *   RISC_PUBLIC_URL=https://staging.example/api/auth/google/risc pnpm preflight:google-risc
 *   EXPECT_RISC_ENABLED=true pnpm preflight:google-risc   # default when unset: true
 */
import assert from 'node:assert/strict';

const expectEnabled =
  process.env.EXPECT_RISC_ENABLED !== 'false' &&
  process.env.EXPECT_RISC_ENABLED !== '0';

function resolvePublicUrl() {
  if (process.env.RISC_PUBLIC_URL) {
    return new URL(process.env.RISC_PUBLIC_URL);
  }
  const origin = process.env.FRONTEND_ORIGIN;
  if (!origin) {
    throw new Error(
      'Set RISC_PUBLIC_URL or FRONTEND_ORIGIN (e.g. https://staging.example.com).',
    );
  }
  return new URL('/api/auth/google/risc', origin.replace(/\/$/, '') + '/');
}

let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks += 1;
};

const target = resolvePublicUrl();
console.log(`preflight: POST ${target.href} (expect RISC ${expectEnabled ? 'on' : 'off'})`);

const response = await fetch(target.href, {
  method: 'POST',
  headers: { 'Content-Type': 'application/secevent+jwt' },
  body: '',
});

const status = response.status;
if (expectEnabled) {
  check(status === 400, `empty POST returns 400 when RISC enabled (got ${status})`);
  const body = await response.json().catch(() => ({}));
  check(
    body?.code === 'RISC_SET_MALFORMED' || body?.code === 'VALIDATION_ERROR',
    'malformed/empty SET error code present',
  );
} else {
  check(status === 404, `empty POST returns 404 when RISC disabled (got ${status})`);
}

const readyUrl = process.env.RISC_READY_URL ?? process.env.HEALTH_READY_URL;
if (readyUrl) {
  const ready = await fetch(readyUrl, { method: 'GET' });
  check(ready.status === 200 || ready.status === 503, `ready probe responded (${ready.status})`);
  console.log(`ready: GET ${readyUrl} → ${ready.status}`);
}

console.log(`google risc preflight: ${checks} checks passed`);