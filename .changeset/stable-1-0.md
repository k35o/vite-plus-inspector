---
'vite-plus-inspector': major
---

First stable release. Nothing changes from 0.2.0; the number states what the
inspector now commits to.

- It targets Vite+ 1.x. It loads `vite.config.ts` the way `vp` does, resolves
  lint rules the way the bundled oxlint does, and shows every section of the
  config.
- The `vp-inspect` command line — `[root]`, `--port`, `--output`, `--no-open`,
  `--no-watch`, `--version` — and the standalone HTML it writes are stable.
  Removing or changing them, or dropping a Vite+ major, is a breaking change
  and gets a new major.
- What the inspector shows for a config may still improve in minor releases,
  as long as an existing config keeps loading.
