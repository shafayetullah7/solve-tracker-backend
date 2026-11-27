# Learning 3B — content, study, authoring, progress

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Pinned SHAs (same refs as 3A until next commit)

| Repo | SHA |
|------|-----|
| solve-tracker-backend | `d603b8392ff83cdb2f45b3a95493c7155327bc1c` |
| solve-tracker-frontend | `e7b5074e092fef7484623fa982554772045470d2` |

## Automated verification

| Gate | Result |
|------|--------|
| Backend `pnpm test` | 297 passed (includes block payload + progress unit tests) |
| Backend `pnpm api:check` | pass |
| `node scripts/test-learning-integration.mjs` (after `pnpm build`) | pass (**27** assertions: move, replay, stale revisions, content CRUD, completion) |
| Frontend `pnpm check` | 433 passed |
| Frontend `pnpm build` + `api:check` | pass |

## Delivered (3B R1)

### Backend

- Migration `learning_blocks`, `learning_node_progress`.
- `GET/PUT …/nodes/:nodeId/content` with `expectedContentRevision` conflicts.
- `PATCH …/nodes/:nodeId/completion` (idempotent; requires enrollment).
- Tree DTO: `completed` per node, `progress` summary (required steps only).
- Text payload sanitized on write; raw XSS payloads stripped server-side.

### Frontend

- Study shell loads and renders `text` / `code` / `checklist` blocks (`BlockList`, no `innerHTML`).
- `/app/learning/:guideId/edit/:nodeId` minimal block editor (add/remove/reorder, save with revision).
- Manual **Mark complete** on study for `completionMode: manual`.
- Overview shows required-step progress fraction.

## Editor spike decision

**Choice:** Plain `<textarea>` / inputs for 3B R1. No new WYSIWYG or block-editor library.

**Rationale:** Matches incremental plan; `BLOCK_EDITOR_DESIGN.md` evaluation deferred until markdown textarea proves insufficient in dogfood.

## Known limits (defer 3C+ / full A1 editor)

- No drag-and-drop reorder in UI (buttons only); no move/reorder tree UI (API covered in integration).
- Block types: text, code, checklist only — no images, video, links, rich text.
- No import/export, private notes, or structural auto-completion rules.
- No autosave or undo stack on editor (explicit save).

## Security notes (A03/A05 partial)

- Integration stores HTML in text blocks; read path returns sanitized body.
- Frontend renders text as escaped text nodes; component test covers script tag in body.