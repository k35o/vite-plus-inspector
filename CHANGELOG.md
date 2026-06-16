# vite-plus-inspector

## 0.1.0

### Minor Changes

- [`9cdd2a6`](https://github.com/k35o/vite-plus-inspector/commit/9cdd2a642cc279eb3e4b837e6c5c41e5018f63ff) Thanks [@k35o](https://github.com/k35o)! - Initial release. A standalone CLI (`vp-inspect` / `npx vite-plus-inspector`) that
  loads a vite-plus `vite.config.ts` and visualizes every section in the browser,
  with effective oxlint rule resolution (recursive `extends` flattening, severity
  merge, per-file override resolution) and links to oxc.rs rule docs.

- [`a22f2e8`](https://github.com/k35o/vite-plus-inspector/commit/a22f2e8b7f1b91be927012a185436634b8eb3de1) Thanks [@k35o](https://github.com/k35o)! - Close the gap with `@eslint/config-inspector`:

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

- [`c96713a`](https://github.com/k35o/vite-plus-inspector/commit/c96713a7a1ffdbdd30f2ae191c8bad307b55ae97) Thanks [@k35o](https://github.com/k35o)! - Add a static export (`--output <file>`) that writes a standalone, shareable
  HTML snapshot. Per-file rule resolution now runs entirely client-side from
  embedded data, so the exported page works offline with no server (matching
  `@eslint/config-inspector build`). The `/__resolve` endpoint is removed; the
  served and static pages share the same client resolver.

### Patch Changes

- [`7fa3680`](https://github.com/k35o/vite-plus-inspector/commit/7fa3680fbef0bceb6002b7e0e0d98fb838156dac) Thanks [@k35o](https://github.com/k35o)! - Adopt @k8o/arte-odyssey design tokens (OKLCH palette → semantic fg/bg/border/
  primary tokens, light + dark) for the inspector's colors, radii and shadows, so
  it matches the k8o design language. The token values are inlined as plain CSS —
  no runtime dependency, Tailwind, or build step is added, and the single-file /
  offline static export is preserved.
