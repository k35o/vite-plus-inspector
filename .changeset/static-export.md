---
'vite-plus-inspector': minor
---

Add a static export (`--output <file>`) that writes a standalone, shareable
HTML snapshot. Per-file rule resolution now runs entirely client-side from
embedded data, so the exported page works offline with no server. The `/__resolve` endpoint is removed; the
served and static pages share the same client resolver.
