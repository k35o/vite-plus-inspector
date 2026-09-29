---
'vite-plus-inspector': minor
---

Support vite-plus v1.0.0. Configs written for vite-plus 0.x are no longer
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
