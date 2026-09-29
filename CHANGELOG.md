# vite-plus-inspector

## 0.2.0

### Minor Changes

- Support vite-plus v1.0.0. Configs written for vite-plus 0.x are no longer
  supported.

  - `run` tasks keep their cache settings under `cache`, and a task may be written
    as a command string or a list of commands.
  - The `check` and `defaultPackage` blocks get their own sections, and
    `create.templates` is listed.
  - Overrides honor `excludeFiles`, in the lint and fmt sections and when resolving
    the rules for a file path.
  - The rule catalog is read from the vite-plus installed in the inspected project
    instead of a `vp` found on `PATH`, and the reason is printed when it can't be
    read.
  - `lazyPlugins()` factories are not run while the config is loaded.
  - Task functions and regular expressions in a config are shown instead of being
    dropped.
  - Live reload now shows the edited config. It kept serving the config as it was
    when the inspector started.

### Patch Changes

- Show where a lint override comes from and which plugins it enables.

  - In the Overrides card, an override inherited from a preset in `lint.extends`
    names that preset. The config's own overrides look as before.
  - An override that names `plugins` lists them.

- Resolve lint rules the way the oxlint in vite-plus v1.0.0 does. The inspector
  used to show rules as enabled that oxlint never runs.

  - A rule is on only when its plugin is enabled. The enabled plugins are the ones
    every config along `extends` names, together; a config that names none adds
    `unicorn`, `typescript` and `oxc`.
  - Correctness rules of every enabled plugin warn unless a config sets the
    category.
  - An override that enables a plugin brings that plugin's category baseline to
    the files it matches, and only sets rules of plugins it can see.
  - Override patterns match like oxlint's: a pattern without a slash matches at
    any depth, a leading `./` is dropped, and `[ab]`, `[!a]` and a leading `!`
    are understood.
  - Overrides and `options` of extended presets are taken into account.
  - Rule ids written through an alias (`@typescript-eslint/…`, `react-hooks/…`,
    `import-x/…`, …) are recognized as the rule they name.
  - Rules of JS plugins no longer link to oxc.rs pages that do not exist.
  - A type-aware rule is marked as not running when `options.typeAware` is off.

- Show config values the inspector used to drop or mangle.

  - The test section shows the options set beside `test.projects`. It showed the
    projects alone.
  - The lint section shows the JS plugins, those of the presets included, and the
    config's `env` and `globals`. An override shows the ones it sets.
  - A list value such as `pack.format` or `test.include` shows its items instead of
    their count.
  - `Infinity` and `NaN` are shown as written instead of `null`, so a
    `testTimeout: Infinity` reads as the disabled timeout it is.
  - A BigInt in the config no longer stops the inspector.

## 0.1.1

### Patch Changes

- Switch release automation from changesets/action to [pnpm-release-action](https://github.com/k35o/pnpm-release-action) (pnpm built-in release management). No runtime changes.

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
