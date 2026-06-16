---
'vite-plus-inspector': minor
---

Close the gap with `@eslint/config-inspector`:

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
