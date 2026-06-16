# vite-plus-inspector

## 0.1.0

### Minor Changes

- [`0fffca9`](https://github.com/k35o/vite-plus-inspector/commit/0fffca9a800fa5096f026577f059f302b287d539) Thanks [@k35o](https://github.com/k35o)! - Initial release. A standalone CLI (`vp-inspect` / `npx vite-plus-inspector`) that
  loads a vite-plus `vite.config.ts` and visualizes every section in the browser,
  with effective oxlint rule resolution (recursive `extends` flattening, severity
  merge, per-file override resolution) and links to oxc.rs rule docs.

- [`84de429`](https://github.com/k35o/vite-plus-inspector/commit/84de42959105c281702b7c7fab2ce1f554b42e22) Thanks [@k35o](https://github.com/k35o)! - Comprehensive oxlint rule visibility:

  - **Full rule catalog** — pull every registered oxlint rule (800+) from
    `vp lint --rules`, not just the ones named in the config, so you can find
    available, recommended-but-disabled, or deprecated-shaped rules.
  - **Rule metadata** — each rule shows its category, auto-fixable flag,
    type-aware flag and docs link.
  - **Effective severity for all rules** — category baselines are expanded onto
    every catalog rule, with source attribution.
  - **Filters** — by state, plugin, category, "explicitly configured", and
    "default-on but disabled".
  - **Live reload** — watch `vite.config.ts` and refresh open tabs on change
    (`--no-watch` to opt out).

- [`af6efd9`](https://github.com/k35o/vite-plus-inspector/commit/af6efd948e112e9305056247a46df9c89c3eecaf) Thanks [@k35o](https://github.com/k35o)! - Add a static export (`--output <file>`) that writes a standalone, shareable
  HTML snapshot. Per-file rule resolution now runs entirely client-side from
  embedded data, so the exported page works offline with no server. The `/__resolve` endpoint is removed; the
  served and static pages share the same client resolver.

### Patch Changes

- [`2294db5`](https://github.com/k35o/vite-plus-inspector/commit/2294db5acc415efb0183e5290bcb4c472aa8a829) Thanks [@k35o](https://github.com/k35o)! - Adopt @k8o/arte-odyssey design tokens (OKLCH palette → semantic fg/bg/border/
  primary tokens, light + dark) for the inspector's colors, radii and shadows, so
  it matches the k8o design language. The token values are inlined as plain CSS —
  no runtime dependency, Tailwind, or build step is added, and the single-file /
  offline static export is preserved.
