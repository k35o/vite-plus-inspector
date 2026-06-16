import { fmt, test, typescript } from '@k8o/oxc-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    ...fmt,
    ignorePatterns: ['CHANGELOG.md'],
  },
  lint: {
    extends: [typescript],
    ignorePatterns: ['CHANGELOG.md'],
    options: {
      typeAware: true,
    },
    overrides: [
      {
        files: ['tests/**/*.test.ts'],
        plugins: [...(test.plugins ?? [])],
        rules: test.rules ?? {},
      },
      {
        // The CLI legitimately writes progress to the terminal.
        files: ['src/cli.ts'],
        rules: {
          'no-console': 'off',
        },
      },
    ],
  },
  pack: {
    entry: { cli: 'src/cli.ts' },
    format: 'esm',
    dts: false,
    outDir: 'dist',
    platform: 'node',
    clean: true,
  },
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
  staged: {
    '*.{js,ts,cjs,mjs,jsx,tsx,json,jsonc}': 'vp check --fix',
  },
});
