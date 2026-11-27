# Learning 3C — portability + link blocks (partial media)

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

### Backend

- `learning_import_previews` table + migration `20261127134655_clever_hairball`
- `POST /learning/imports/preview`, `POST /learning/imports/:importId/commit`
- `GET /learning/guides/:guideId/export?format=json|markdown`
- `POST /learning/guides/:guideId/copies`
- Portable schema v1 (`learning-portable.schema.ts`) + markdown outline parser
- **`link` block type** (http/https allowlist)

### Frontend

- `/app/learning/import` preview + commit
- Library **Import guide**; overview export JSON/Markdown
- Link block editor + study renderer

## Not in this workspace slice

- ZIP bundle import/export
- Private image blocks, media proxy, `learning_block_media` (see [LEARNING_MEDIA_SPIKE_RESULTS.md](./LEARNING_MEDIA_SPIKE_RESULTS.md))
- Full Cloudinary lifecycle / quota worker

## Verification

| Gate | Result |
|------|--------|
| Backend `pnpm test` | 298 passed (incl. markdown outline spec) |
| `pnpm api:export` | pass |
| Integration JSON roundtrip | extend `test-learning-integration.mjs` when DB available |