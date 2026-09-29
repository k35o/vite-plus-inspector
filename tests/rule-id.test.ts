import type { RuleMeta } from '../src/catalog.ts';
import {
  normalizePluginName,
  normalizeRuleId,
  pluginOf,
} from '../src/rule-id.ts';

function catalogOf(...ids: string[]): Map<string, RuleMeta> {
  return new Map(
    ids.map((id) => [
      id,
      {
        id,
        plugin: pluginOf(id),
        category: 'correctness',
        typeAware: false,
        fixable: false,
        defaultOn: false,
        docsUrl: `https://oxc.rs/${id}`,
      },
    ]),
  );
}

const none = catalogOf();

describe('normalizePluginName', () => {
  test.each([
    ['react-hooks', 'react'],
    ['react_hooks', 'react'],
    ['@typescript-eslint', 'typescript'],
    ['typescript-eslint', 'typescript'],
    ['import-x', 'import'],
    ['jsx-a11y-x', 'jsx-a11y'],
    ['jsx_a11y', 'jsx-a11y'],
    ['react_perf', 'react-perf'],
    ['deepscan', 'oxc'],
    ['eslint-plugin-unicorn', 'unicorn'],
    ['oxlint-plugin-unicorn', 'unicorn'],
    ['@typescript-eslint/eslint-plugin', 'typescript'],
    ['@acme/eslint-plugin-rules', '@acme/rules'],
  ])('%s is another name for %s', (alias, plugin) => {
    expect(normalizePluginName(alias)).toBe(plugin);
  });

  test('a name that is no alias is kept', () => {
    expect(normalizePluginName('vitest')).toBe('vitest');
  });
});

describe('normalizeRuleId', () => {
  test.each([
    ['@typescript-eslint/no-explicit-any', 'typescript/no-explicit-any'],
    ['react-hooks/rules-of-hooks', 'react/rules-of-hooks'],
    ['react_hooks/exhaustive-deps', 'react/exhaustive-deps'],
    ['@next/next/no-img-element', 'nextjs/no-img-element'],
    ['import-x/no-cycle', 'import/no-cycle'],
    ['jsx-a11y-x/alt-text', 'jsx-a11y/alt-text'],
    ['jsx_a11y/anchor-is-valid', 'jsx-a11y/anchor-is-valid'],
    ['react_perf/jsx-no-jsx-as-prop', 'react-perf/jsx-no-jsx-as-prop'],
    ['deepscan/bad-bitwise-operator', 'oxc/bad-bitwise-operator'],
    ['eslint/no-console', 'no-console'],
    ['eslint-plugin-unicorn/no-null', 'unicorn/no-null'],
  ])('%s names the rule %s', (written, id) => {
    expect(normalizeRuleId(written, none)).toBe(id);
  });

  test('an id already in its canonical form is kept', () => {
    expect(normalizeRuleId('unicorn/no-null', none)).toBe('unicorn/no-null');
  });

  test('a rule of a scoped JS plugin keeps its scope', () => {
    expect(normalizeRuleId('@acme/rules/no-foo', none)).toBe(
      '@acme/rules/no-foo',
    );
  });

  test('a typescript id names the eslint rule that stands in for it', () => {
    const catalog = catalogOf('no-unused-vars', 'typescript/no-explicit-any');
    expect(normalizeRuleId('typescript/no-unused-vars', catalog)).toBe(
      'no-unused-vars',
    );
  });

  test('a typescript id written with an alias names the eslint rule too', () => {
    const catalog = catalogOf('no-unused-vars');
    expect(normalizeRuleId('@typescript-eslint/no-unused-vars', catalog)).toBe(
      'no-unused-vars',
    );
  });

  test('a typescript rule with an eslint namesake stays a typescript rule', () => {
    const catalog = catalogOf('require-await', 'typescript/require-await');
    expect(normalizeRuleId('typescript/require-await', catalog)).toBe(
      'typescript/require-await',
    );
  });

  test('a bare name only another plugin has names that plugin’s rule', () => {
    const catalog = catalogOf('no-console', 'unicorn/no-null');
    expect(normalizeRuleId('no-null', catalog)).toBe('unicorn/no-null');
  });

  test('a bare name several plugins share names the eslint rule', () => {
    const catalog = catalogOf('no-nested-ternary', 'unicorn/no-nested-ternary');
    expect(normalizeRuleId('no-nested-ternary', catalog)).toBe(
      'no-nested-ternary',
    );
  });

  test('a bare name without an eslint rule names the first plugin that has it', () => {
    const catalog = catalogOf(
      'typescript/prefer-includes',
      'unicorn/prefer-includes',
    );
    expect(normalizeRuleId('prefer-includes', catalog)).toBe(
      'typescript/prefer-includes',
    );
  });
});

describe('pluginOf', () => {
  test('a bare id belongs to eslint', () => {
    expect(pluginOf('no-console')).toBe('eslint');
  });

  test('a prefixed id belongs to its prefix', () => {
    expect(pluginOf('jsx-a11y/alt-text')).toBe('jsx-a11y');
  });

  test('a scoped id belongs to the scope and the plugin name', () => {
    expect(pluginOf('@acme/rules/no-foo')).toBe('@acme/rules');
  });
});
