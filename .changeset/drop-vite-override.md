---
'vite-plus-inspector': none
---

Drop the pnpm override that pointed `vite` at `@voidzero-dev/vite-plus-core`. With it in place, any lockfile update that re-resolves the vite-plus subtree fails, which is what Renovate does on every dependency bump. A lockfile regenerated without it contains no standalone vite either. Dev tooling only.
