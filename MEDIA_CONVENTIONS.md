# Media, gallery, and profile photo conventions

This document is the **long-lived contract** for user-owned images in the coding practice tracker. It applies to backend persistence, APIs, background jobs, and frontend upload/link flows. Do not invent parallel storage fields (for example `avatar_url` blobs in Postgres or per-feature S3 keys without a `media` row).

**Related:** [BACKEND_CONVENTIONS.md](./BACKEND_CONVENTIONS.md), [DRIZZLE_CONVENTIONS.md](./DRIZZLE_CONVENTIONS.md), [cp-frontend/FRONTEND_CONVENTIONS.md](../cp-frontend/FRONTEND_CONVENTIONS.md) §8.1 (profile UI), [REQUIREMENTS.md](./REQUIREMENTS.md) (auth `users` vs public profile).

---

## 1. Goals

- **One upload pipeline** for all user images (gallery, profile avatar, future surfaces).
- **Cloudinary** stores bytes; Postgres stores metadata and **reference counting**, not file content.
- **Gallery** is derived: users only see media they own with **`usage_count > 0`**.
- **Orphans** (`usage_count = 0`) are hidden and may be deleted by a **background job**.
- **Authenticated APIs**; every row has an owning **`user_id`**.

---

## 2. Core tables (conceptual)

### `media`

| Column | Notes |
| --- | --- |
| `id` | UUID primary key |
| `user_id` | FK → `users.id`, `ON DELETE CASCADE` |
| `usage_count` | Integer, **0–2** (see §3). Enforced in application layer inside transactions. |
| `provider` | `text`, default `cloudinary` (MVP) |
| `public_id` | Cloudinary identifier — **not** a stored URL |
| `resource_type` | PG enum `media_resource_type` (`image` today); discriminant for `meta` |
| `extension` | Delivery format (`webp`, `png`, …) — single source; not duplicated in `meta` |
| `meta` | `jsonb` — type-specific payload; **always** parse with [`parseMediaMeta`](src/modules/media/schemas/media-meta.schema.ts) / [`parseMediaRecord`](src/modules/media/schemas/media-meta.schema.ts) |
| `created_at`, `updated_at` | `timestamptz` |

**`meta` by `resource_type` (Zod in `imageMediaMetaSchema`):** `image` → `{ bytes, width, height }`. Use [`newImageMediaInsert`](src/modules/media/schemas/media-meta.schema.ts) for type-safe writes. Application types: [`media-meta.types.ts`](src/modules/media/media-meta.types.ts). Do not store URLs, duplicate `format`/`bytes`/dimensions at top level, or repeat `resource_type` inside `meta`.

Do **not** add `usage_kind`, `in_gallery`, or a `media_usages` table. **`usage_count`** (0–2) is the only counter on `media`; the **profile slot** is `users.avatar_media_id`; gallery vs profile-only at count **1** is determined in application logic (§3.2). Keep **`usage_count`** correct inside transactions (§3).

### Profile (and other consumers)

- **`users.avatar_media_id`** → nullable FK → `media.id` (profile **slot**).
- Public **`users.name`**, **`users.bio`**, and work/education child tables share the `users` row with auth (`email`, `password_hash`). One **`name`** column for register, session, and profile edits.

---

## 3. `usage_count` semantics (two slots)

`usage_count` is the number of **active reference slots**, not views or downloads. There are exactly **two slot types**:

| Slot | Meaning |
| --- | --- |
| **Gallery** | User has committed this media to their gallery (upload-to-gallery or equivalent API). |
| **Profile avatar** | `users.avatar_media_id` points at this `media.id`. |

Invariant:

```text
usage_count = (gallery_slot ? 1 : 0) + (profile_slot ? 1 : 0)
```

Valid values: **0**, **1**, or **2** only.

There is **no** separate gallery table for MVP: **gallery list API** returns `media` where `user_id = session user` and **`usage_count > 0`**, ordered by recency or product rule.

### 3.1 Visibility and product rules

| `usage_count` | Typical state | Shown in gallery? |
| --- | --- | --- |
| **0** | Uploaded but never linked, or fully detached | **No** |
| **1** | Gallery-only **or** profile-only | **Yes** (profile-only still appears in gallery) |
| **2** | Gallery **and** profile both reference this media | **Yes** |

- **Profile alone** → profile slot on save → **`usage_count = 1`**, visible in gallery.
- **Gallery upload / add to gallery** → gallery slot → **`+1`** (0→1, or 1→2 if profile already linked).
- **Profile save while media already in gallery** → profile slot → **1→2**.

### 3.2 Disambiguating `usage_count === 1`

A single counter does not say *which* slot is active. Use:

- **Profile slot:** `users.avatar_media_id = media.id`
- **Gallery-only slot:** `usage_count === 1` **and** `avatar_media_id` is **not** this media (or is null)

**Remove from gallery** is allowed **only** when the row is **gallery-only**:

```text
can_remove_from_gallery =
  usage_count === 1 AND avatar_media_id IS DISTINCT FROM media.id
```

If `usage_count === 1` and the media **is** the current avatar, the UI must **not** offer gallery remove; the user clears or changes the profile photo instead.

### 3.3 Transition table (atomic)

All mutations run in a **single database transaction**, with **`SELECT … FROM media WHERE id = $1 AND user_id = $2 FOR UPDATE`**, verify ownership, then adjust slots and `usage_count`. Reject if the resulting count would be outside 0–2.

| Action | Count before | Count after |
| --- | --- | --- |
| Upload file (create `media` row only) | — | **0** |
| Commit to gallery (gallery slot +1) | 0 | **1** |
| Commit to gallery | 1 (profile only) | **2** |
| Save profile avatar (profile slot +1) | 0 | **1** |
| Save profile avatar | 1 (gallery only) | **2** |
| Clear / change profile avatar (profile slot −1) | 2 | **1** (stays in gallery) |
| Clear profile avatar (profile slot −1) | 1 (profile only) | **0** |
| Remove from gallery (gallery slot −1, gallery-only) | 1 | **0** |

**Profile avatar swap:** one transaction: decrement old media profile slot (if any), increment new media profile slot, update `avatar_media_id`.

**Race safety:** never read-modify-write `usage_count` outside a transaction; use row lock + invariant checks. Concurrent link/unlink for the same `media.id` must serialize on that row.

---

## 4. Upload and link API shape

### 4.1 Single upload endpoint

- **`POST /media`** (authenticated, multipart): stream to Cloudinary, insert `media` with **`usage_count = 0`**, return `{ id, url | delivery hints, … }`.
- Upload **does not** bump `usage_count` unless the endpoint explicitly implements “upload and add to gallery” as one documented transaction (gallery slot +1 in the same TX as insert → count **1**).

### 4.2 Link on commit (profile)

Matches pessimistic profile UI:

1. Client uploads → holds `mediaId` in the editor modal.
2. User clicks **Save** → **`PATCH /users/me/profile`** (or dedicated avatar link) with `avatarMediaId`.
3. Server TX: attach profile slot, set FK, adjust counts; return canonical profile including resolved `avatarUrl`.

If the user closes the modal without saving, **no profile slot** is applied; if gallery was never committed either, **`usage_count` stays 0**.

### 4.3 Gallery commit

- **`POST /media/:id/gallery`** (or equivalent): gallery slot +1 after ownership check.
- List: **`GET /media`** (or `/users/me/media`): **`usage_count > 0`** only.

### 4.4 Gallery remove

- **`DELETE /media/:id/gallery`** (or equivalent): allowed only when **`can_remove_from_gallery`** (§3.2); gallery slot −1 → **0**.

### 4.5 Ownership

Every read/link/unlink/delete must verify **`media.user_id === session.user.id`**. Cross-user `media.id` → **404** (same as topics/problems).

---

## 5. Orphan cleanup

- **Never** list or return **`usage_count = 0`** media in gallery (or any user-facing library).
- Background job (interval TBD): select `media` where **`usage_count = 0`** and `created_at < now() - grace_period`.
- Delete object in **Cloudinary**, then delete `media` row.
- Use `created_at` (and a fixed grace interval in the job) for orphans with `usage_count = 0`.

---

## 6. Cloudinary configuration

- Store **provider identifiers** on `media` (`public_id`, etc.), not permanent user-facing URLs as the source of truth.
- Environment variables (placeholders in `.env.example` until credentials are provisioned):

| Variable | Purpose |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Cloud name |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | API secret (server only) |

- Validate upload MIME type and size in API (align with frontend rules in `profile-avatar-upload.ts` where applicable).
- Deleting a `media` row must attempt Cloudinary destroy when the row is removed or when cleanup runs; handle idempotent “not found” from Cloudinary.

---

## 7. Frontend obligations

- **Upload** via shared media API; receive **`mediaId`**.
- **Link** profile (or gallery) only on **successful save** / explicit gallery action — **no optimistic** `usage_count` or avatar URL on the server before commit.
- Gallery UI must not show **`usage_count === 0`** items (they are not returned by list APIs).
- **Remove from gallery** control only when the API indicates gallery-only (or infer: count 1 and not current avatar).
- Avatar editor: [`ProfileAvatarEditorDialog`](../cp-frontend/src/components/profile/ProfileAvatarEditorDialog.tsx) pattern — upload in modal, **`onSave`** links; until APIs land, mock client does not replace this contract.

When OpenAPI lands, add `profile.api.ts` / `media.api.ts` under `src/lib/api/modules/` per existing module patterns; do not bypass `media` with direct Cloudinary from the browser for permanent storage (unsigned upload policies are a separate security decision if ever added).

---

## 8. Explicit non-goals (MVP)

- Storing image bytes in PostgreSQL.
- Public anonymous CDN gallery across users.
- `usage_kind` dimension tables unless a third slot type is added (then revisit §3).
- Decrementing gallery when removing profile while `usage_count === 2` (profile remove only drops profile slot → **1**, image stays in gallery).

---

## 9. Review checklist

- [ ] New image feature creates or references a **`media` row** and uses slot/count rules above.
- [ ] Multi-step link/unlink is **transactional** with row lock on `media`.
- [ ] Gallery queries filter **`usage_count > 0`**.
- [ ] Gallery remove blocked when media is the active profile photo with **count 1**.
- [ ] Upload without commit leaves **count 0** and hidden from gallery.
- [ ] Cloudinary secrets stay server-side; `.env.example` documents placeholders.
- [ ] Frontend and backend docs updated if behavior changes.