import {
  buildInspectorData,
  buildLintView,
  serializeInspectorData,
} from '../src/model.ts';
import type { LintNode, VitePlusConfig } from '../src/types.ts';

const base: LintNode = {
  plugins: ['eslint', 'oxc'],
  categories: { correctness: 'error' },
  rules: { 'no-console': 'warn' },
};
const typescript: LintNode = {
  extends: [base],
  plugins: ['eslint', 'oxc', 'typescript'],
  rules: { 'typescript/no-explicit-any': 'error' },
};

function inspect(config: VitePlusConfig) {
  return buildInspectorData(config, '/p/vite.config.ts');
}

describe('buildLintView', () => {
  const view = buildLintView({
    extends: [typescript],
    options: { typeAware: true },
    ignorePatterns: ['CHANGELOG.md'],
    overrides: [{ files: ['tests/**'], rules: { 'no-console': 'off' } }],
  });

  test('summarizes presets with recursive rule counts', () => {
    expect(view.presets).toHaveLength(1);
    expect(view.presets[0]?.label).toBe('typescript');
    expect(view.presets[0]?.ruleCount).toBe(2);
  });

  test('computes effective base rules and counts (no catalog)', () => {
    expect(view.rules).toHaveLength(2);
    expect(view.counts.error).toBe(1);
    expect(view.counts.warn).toBe(1);
    expect(view.hasCatalog).toBe(false);
    expect(view.configuredCount).toBe(2);
  });

  test('enriches rules from a catalog when provided', () => {
    const enriched = buildLintView({}, [
      {
        id: 'no-console',
        plugin: 'eslint',
        category: 'suspicious',
        typeAware: false,
        fixable: false,
        defaultOn: false,
        docsUrl: 'https://oxc.rs/x',
      },
      {
        id: 'unicorn/no-null',
        plugin: 'unicorn',
        category: 'style',
        typeAware: false,
        fixable: true,
        defaultOn: false,
        docsUrl: 'https://oxc.rs/y',
      },
    ]);
    expect(enriched.hasCatalog).toBe(true);
    expect(enriched.totalRules).toBe(2);
    expect(enriched.facets.plugins).toContain('unicorn');
    expect(enriched.facets.categories).toContain('style');
  });

  test('summarizes overrides', () => {
    expect(view.overrides).toStrictEqual([
      { files: ['tests/**'], excludeFiles: [], ruleCount: 1 },
    ]);
  });

  test('carries excludeFiles to the summary and the per-file resolver data', () => {
    const excluding = buildLintView({
      overrides: [
        {
          files: ['**/*.test.ts'],
          excludeFiles: ['src/gen.test.ts'],
          rules: { 'no-debugger': 'off' },
        },
      ],
    });
    expect(excluding.overrides[0]?.excludeFiles).toStrictEqual([
      'src/gen.test.ts',
    ]);
    expect(excluding.resolve.overrides[0]?.excludeFiles).toStrictEqual([
      'src/gen.test.ts',
    ]);
  });

  test('carries options and ignore patterns', () => {
    expect(view.options).toStrictEqual({ typeAware: true });
    expect(view.ignorePatterns).toStrictEqual(['CHANGELOG.md']);
  });

  const preset: LintNode = {
    options: { typeAware: true },
    settings: { react: { version: '18.0.0' } },
    ignorePatterns: ['preset-ignored/**'],
    overrides: [{ files: ['*.test.ts'], rules: { 'no-console': 'off' } }],
  };

  test('takes the overrides of the presets it extends', () => {
    expect(
      buildLintView({
        extends: [preset],
        overrides: [{ files: ['src/cli.ts'], rules: { 'no-console': 'off' } }],
      }).overrides,
    ).toStrictEqual([
      { files: ['*.test.ts'], excludeFiles: [], ruleCount: 1 },
      { files: ['src/cli.ts'], excludeFiles: [], ruleCount: 1 },
    ]);
  });

  test('leaves the settings of the presets it extends out', () => {
    expect(buildLintView({ extends: [preset] }).settings).toStrictEqual({});
  });

  test('leaves the ignore patterns of the presets it extends out', () => {
    expect(buildLintView({ extends: [preset] }).ignorePatterns).toStrictEqual(
      [],
    );
  });

  test('lists the enabled plugins, those of the presets included', () => {
    expect(view.plugins).toStrictEqual([
      'eslint',
      'oxc',
      'typescript',
      'unicorn',
    ]);
  });

  test('counts the rules an override sets, not the ones oxlint drops', () => {
    expect(
      buildLintView({
        plugins: [],
        overrides: [
          {
            files: ['*.tsx'],
            rules: { 'react/jsx-key': 'error', 'no-console': 'off' },
          },
        ],
      }).overrides,
    ).toStrictEqual([{ files: ['*.tsx'], excludeFiles: [], ruleCount: 1 }]);
  });
});

describe('buildInspectorData', () => {
  const data = inspect({
    fmt: { singleQuote: true },
    lint: { extends: [typescript] },
    staged: { '*.ts': 'vp check --fix' },
    pack: { entry: { cli: 'src/cli.ts' } },
  });

  test('records section presence', () => {
    expect(data.present).toStrictEqual({
      fmt: true,
      lint: true,
      check: false,
      staged: true,
      pack: true,
      defaultPackage: false,
      test: false,
      run: false,
      create: false,
    });
  });

  test('keeps the config path', () => {
    expect(data.configPath).toBe('/p/vite.config.ts');
  });

  test('builds a lint view when lint is present', () => {
    expect(data.lint?.rules.length).toBeGreaterThan(0);
  });
});

describe('check', () => {
  test('carries the vp check step switches', () => {
    const data = inspect({ check: { fmt: false } });
    expect(data.present.check).toBe(true);
    expect(data.check).toStrictEqual({ fmt: false });
  });
});

describe('defaultPackage', () => {
  test('is recorded as present', () => {
    expect(inspect({ defaultPackage: './web' }).present.defaultPackage).toBe(
      true,
    );
  });

  test('a string targets all four commands', () => {
    expect(
      inspect({ defaultPackage: './frontend' }).defaultPackage,
    ).toStrictEqual({
      dev: './frontend',
      build: './frontend',
      preview: './frontend',
      pack: './frontend',
    });
  });

  test('an object keeps only the commands it maps', () => {
    expect(
      inspect({ defaultPackage: { dev: './web', pack: './lib' } })
        .defaultPackage,
    ).toStrictEqual({ dev: './web', pack: './lib' });
  });
});

describe('pack', () => {
  test('null when absent', () => {
    expect(inspect({}).pack).toBeNull();
  });

  test('an array yields one view per build', () => {
    expect(
      inspect({ pack: [{ entry: 'a.ts' }, { entry: 'b.ts' }] }).pack,
    ).toHaveLength(2);
  });

  test('a string entry is a single unnamed entry', () => {
    expect(
      inspect({ pack: { entry: 'src/index.ts' } }).pack?.[0]?.entries,
    ).toStrictEqual([{ name: null, files: ['src/index.ts'] }]);
  });

  test('an object entry is named by its keys and keeps glob lists', () => {
    expect(
      inspect({
        pack: {
          entry: {
            cli: 'src/cli.ts',
            'hooks/*': ['./src/hooks/*.ts', '!./src/hooks/index.ts'],
          },
        },
      }).pack?.[0]?.entries,
    ).toStrictEqual([
      { name: 'cli', files: ['src/cli.ts'] },
      { name: 'hooks/*', files: ['./src/hooks/*.ts', '!./src/hooks/index.ts'] },
    ]);
  });

  test('an array entry may mix strings and objects', () => {
    expect(
      inspect({ pack: { entry: ['src/a.ts', { b: 'src/b.ts' }] } }).pack?.[0]
        ?.entries,
    ).toStrictEqual([
      { name: null, files: ['src/a.ts'] },
      { name: 'b', files: ['src/b.ts'] },
    ]);
  });

  test('options are everything except entry', () => {
    expect(
      inspect({
        pack: { entry: 'src/index.ts', format: ['esm', 'cjs'], dts: true },
      }).pack?.[0]?.options,
    ).toStrictEqual({ format: ['esm', 'cjs'], dts: true });
  });
});

describe('run', () => {
  test('a string task is shorthand for its command', () => {
    expect(
      inspect({ run: { tasks: { build: 'vp build' } } }).run?.tasks,
    ).toStrictEqual({
      build: { commands: ['vp build'] },
    });
  });

  test('an array task is shorthand for sequential commands', () => {
    expect(
      inspect({ run: { tasks: { check: ['vp lint', 'vp build'] } } }).run
        ?.tasks,
    ).toStrictEqual({ check: { commands: ['vp lint', 'vp build'] } });
  });

  test('an array command keeps every command in order', () => {
    expect(
      inspect({
        run: { tasks: { check: { command: ['vp lint', 'vp build'] } } },
      }).run?.tasks,
    ).toStrictEqual({ check: { commands: ['vp lint', 'vp build'] } });
  });

  test('cache settings live under the task cache object', () => {
    expect(
      inspect({
        run: {
          tasks: {
            build: {
              command: 'node build.mjs',
              cwd: 'packages/a',
              dependsOn: ['lint', { task: 'build', from: 'dependencies' }],
              cache: {
                env: ['NODE_ENV'],
                untrackedEnv: ['CI'],
                input: [{ auto: true }, '!dist/**'],
                output: [],
              },
            },
          },
        },
      }).run?.tasks,
    ).toStrictEqual({
      build: {
        commands: ['node build.mjs'],
        cwd: 'packages/a',
        dependsOn: ['lint', { task: 'build', from: 'dependencies' }],
        cache: {
          env: ['NODE_ENV'],
          untrackedEnv: ['CI'],
          input: [{ auto: true }, '!dist/**'],
          output: [],
        },
      },
    });
  });

  test('keeps the global settings', () => {
    const { run } = inspect({
      run: { cache: { scripts: true }, enablePrePostScripts: false },
    });
    expect(run?.cache).toStrictEqual({ scripts: true });
    expect(run?.enablePrePostScripts).toBe(false);
    expect(run?.tasks).toStrictEqual({});
  });
});

describe('create', () => {
  test('carries the default template and the local templates', () => {
    const create = {
      defaultTemplate: 'component',
      templates: [
        {
          name: 'component',
          description: 'Internal UI component',
          template: './tools/create-component',
        },
      ],
    };
    expect(inspect({ create }).create).toStrictEqual(create);
  });
});

function typecheck(): string {
  return 'tsc --noEmit';
}

function generate(): string[] {
  return ['vp check'];
}

/** What the browser receives for a config. */
function received(config: VitePlusConfig): unknown {
  return JSON.parse(serializeInspectorData(inspect(config)));
}

describe('serializeInspectorData', () => {
  test('a staged task function is shown by name instead of being dropped', () => {
    expect(received({ staged: { '*.ts': typecheck } })).toMatchObject({
      staged: { '*.ts': '[Function: typecheck]' },
    });
  });

  test('functions inside task lists keep their position', () => {
    expect(
      received({
        staged: { '*.ts': ['vp fmt', ['vp lint', () => 'vp test']] },
      }),
    ).toMatchObject({
      staged: { '*.ts': ['vp fmt', ['vp lint', '[Function: anonymous]']] },
    });
  });

  test('a staged config generated by a function is shown by name', () => {
    expect(received({ staged: generate })).toMatchObject({
      staged: '[Function: generate]',
    });
  });

  test('a regular expression is shown as its literal', () => {
    expect(
      received({ pack: { deps: { neverBundle: [/^node:/u, 'x'] } } }),
    ).toMatchObject({
      pack: [{ options: { deps: { neverBundle: ['/^node:/u', 'x'] } } }],
    });
  });
});
