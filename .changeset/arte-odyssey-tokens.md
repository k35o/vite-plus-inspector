---
'vite-plus-inspector': patch
---

Adopt @k8o/arte-odyssey design tokens (OKLCH palette → semantic fg/bg/border/
primary tokens, light + dark) for the inspector's colors, radii and shadows, so
it matches the k8o design language. The token values are inlined as plain CSS —
no runtime dependency, Tailwind, or build step is added, and the single-file /
offline static export is preserved.
