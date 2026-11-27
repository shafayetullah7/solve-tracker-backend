# Learning 3B.5 — structure authoring

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- Frontend API: `moveNode`, `deleteNode` (revision headers), `copyNode`, `restoreNode`, `recoverable`
- `placement.ts` client preflight mirroring server hierarchy rules
- `/app/learning/:guideId/structure` workspace (tree + inspector, keyboard Alt+↑/↓)
- Outline actions: Study / Content links; overview **Edit structure**
- Content editor debounced autosave + save state + preview study link
- DnD: **not adopted** — keyboard/button reorder only (documented)

## Gates (local)

| Gate | Result |
|------|--------|
| Backend `pnpm test` | 298 passed |
| Frontend `pnpm check` | run after `api:generate` |
| Integration | requires Postgres on `TEST_DATABASE_URL` |