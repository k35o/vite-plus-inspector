import {
  buildInspectorData,
  buildLintView,
  normalizePack,
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
        fix: 'none',
        defaultOn: false,
        docsUrl: 'https://oxc.rs/x',
      },
      {
        id: 'unicorn/no-null',
        plugin: 'unicorn',
        category: 'style',
        typeAware: false,
        fixable: true,
        fix: 'fixable_fix',
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
    expect(view.overrides).toEqual([{ files: ['tests/**'], ruleCount: 1 }]);
  });

  test('carries options and ignore patterns', () => {
    expect(view.options).toEqual({ typeAware: true });
    expect(view.ignorePatterns).toEqual(['CHANGELOG.md']);
  });
});

describe('normalizePack', () => {
  test('wraps an object', () => {
    expect(normalizePack({ entry: ['src/index.ts'] })).toEqual([
      { entry: ['src/index.ts'] },
    ]);
  });
  test('passes an array through', () => {
    const arr = [{ entry: ['a.ts'] }, { entry: ['b.ts'] }];
    expect(normalizePack(arr)).toBe(arr);
  });
  test('null when absent', () => {
    expect(normalizePack(undefined)).toBeNull();
  });
});

describe('buildInspectorData', () => {
  const config: VitePlusConfig = {
    fmt: { singleQuote: true },
    lint: { extends: [typescript] },
    staged: { '*.ts': 'vp check --fix' },
    pack: { entry: { cli: 'src/cli.ts' } },
  };
  const data = buildInspectorData(config, '/p/vite.config.ts');

  test('records section presence', () => {
    expect(data.present).toEqual({
      fmt: true,
      lint: true,
      staged: true,
      pack: true,
      test: false,
      run: false,
      create: false,
    });
  });

  test('keeps the config path and normalizes pack to an array', () => {
    expect(data.configPath).toBe('/p/vite.config.ts');
    expect(data.pack).toHaveLength(1);
  });

  test('builds a lint view when lint is present', () => {
    expect(data.lint?.rules.length).toBeGreaterThan(0);
  });
});
