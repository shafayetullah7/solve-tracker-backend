# Portable guide schema v1

`schemaVersion: 1`

- `title`, `description`
- `nodes[]`: `localKey`, `parentLocalKey`, `title`, `required`, `completionMode`, `blocks[]`
- Block types: `text`, `code`, `checklist`, `link`
- `mediaManifest[]`: reserved for future private assets (bytes not included in JSON-only export)

Import is atomic via preview → commit; invalid JSON does not create a guide.