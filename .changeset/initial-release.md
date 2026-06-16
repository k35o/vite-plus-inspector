---
'vite-plus-inspector': minor
---

Initial release. A standalone CLI (`vp-inspect` / `npx vite-plus-inspector`) that
loads a vite-plus `vite.config.ts` and visualizes every section in the browser,
with effective oxlint rule resolution (recursive `extends` flattening, severity
merge, per-file override resolution) and links to oxc.rs rule docs.
