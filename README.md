# vite-plus-inspector

Visualize your [vite-plus](https://viteplus.dev) configuration in the browser —
a config inspector for the `vite.config.ts` that drives `vp check`, `vp pack`,
`vp test`, and friends.

It loads your config (TypeScript, `extends`, spreads and all) and renders every
augmented section — `fmt`, `lint`, `staged`, `pack`, `test`, `run`, `create` —
with a focus on **oxlint**: presets are flattened, severities are resolved, and
you can type a file path to see exactly which rules apply to it.

## Usage

Run it in any project that has a `vite.config.ts`:

```sh
npx vite-plus-inspector          # current directory
npx vite-plus-inspector ./app    # a specific project
```

Or install the `vp-inspect` binary globally:

```sh
pnpm add -g vite-plus-inspector
vp-inspect
```

Options:

| Flag                | Description                           | Default           |
| ------------------- | ------------------------------------- | ----------------- |
| `[root]`            | Directory containing `vite.config.ts` | current directory |
| `-p, --port <port>` | Port for the server (or `PORT` env)   | `5177`            |
| `--no-open`         | Don't open the browser automatically  | opens             |

## What it shows

- **Overview** — which sections are configured at a glance.
- **lint (oxlint)** — the star of the show:
  - **Effective severities**, not just what you declared. The `extends` chain is
    flattened recursively (e.g. `nextjs → react → typescript → base`), category
    baselines and individual rules are merged last-wins, and each rule is
    attributed to its source (`base`, `typescript`, `config`, …).
  - **Resolve for a file path** — type `apps/main/foo.test.tsx` and see the
    rules that actually apply, with matching `overrides` layered in.
  - Every rule links to its [oxc.rs](https://oxc.rs) documentation.
- **fmt / staged / pack / test / run / create** — options, ignore patterns,
  overrides, entry points, tasks and more.

The config is loaded with [jiti](https://github.com/unjs/jiti), so it never runs
your build — it only reads the resolved configuration object.

## Develop

```sh
pnpm install
pnpm check     # fmt + lint + typecheck
pnpm test
pnpm build     # vp pack -> dist/
```

## Release

Versioned and published with [Changesets](https://github.com/changesets/changesets).

```sh
pnpm changeset   # describe the change
```

Merging to `main` lets the release workflow open a version PR and publish to npm.
