# vite-plus-inspector

Visualize your vite-plus configuration

## Install

```sh
pnpm add vite-plus-inspector
```

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
