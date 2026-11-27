# Learning media spike (3C gate)

**Date:** 2026-11-27  
**Status:** **Not verified in this environment** — private authenticated Cloudinary delivery was not exercised against a live account from CI/sandbox.

## Fail-closed policy

- Private **image** upload and `learning_block_media` join are **not enabled** in this slice.
- Portability JSON/Markdown exports include `mediaManifest: []` with room for future asset metadata.
- **Link** blocks (http/https) shipped without embedded media bytes.

## Next step before image blocks

1. Run scripted spike per [MEDIA_PRIVACY_ARCHITECTURE.md](./MEDIA_PRIVACY_ARCHITECTURE.md) with production-like Cloudinary credentials.
2. Add additive `media.delivery_class` migration + proxy route + `image` block type.
3. Re-run privacy integration tests (anonymous CDN deny, owner proxy allow).