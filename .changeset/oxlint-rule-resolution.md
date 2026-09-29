---
'vite-plus-inspector': patch
---

Resolve lint rules the way the oxlint in vite-plus v1.0.0 does. The inspector
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
