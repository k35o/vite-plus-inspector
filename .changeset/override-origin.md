---
'vite-plus-inspector': patch
---

Show where a lint override comes from and which plugins it enables.

- In the Overrides card, an override inherited from a preset in `lint.extends`
  names that preset. The config's own overrides look as before.
- An override that names `plugins` lists them.
