import type { RuleMeta } from '../src/catalog.ts';
import {
  countPresetRules,
  flattenExtends,
  inferPresetLabel,
  normalizeSeverity,
  resolveBaseRules,
  resolveCategories,
  resolveEffective,
  resolveOverride,
  resolvePlugins,
  ruleDocsUrl,
  ruleOptions,
} from '../src/resolve.ts';
import type { LintNode } from '../src/types.ts';

function meta(
  id: string,
  category: string,
  extra: Partial<RuleMeta> = {},
): RuleMeta {
  const plugin = id.includes('/') ? id.slice(0, id.indexOf('/')) : 'eslint';
  return {
    id,
    plugin,
    category,
    typeAware: false,
    fixable: false,
    defaultOn: false,
    docsUrl: `https://oxc.rs/${id}`,
    ...extra,
  };
}

describe('normalizeSeverity', () => {
  test('maps error synonyms', () => {
    expect(normalizeSeverity('error')).toBe('error');
    expect(normalizeSeverity('deny')).toBe('error');
    expect(normalizeSeverity(2)).toBe('error');
  });
  test('maps warn synonyms', () => {
    expect(normalizeSeverity('warn')).toBe('warn');
    expect(normalizeSeverity(1)).toBe('warn');
  });
  test('maps off synonyms and unknowns', () => {
    expect(normalizeSeverity('off')).toBe('off');
    expect(normalizeSeverity('allow')).toBe('off');
    expect(normalizeSeverity(0)).toBe('off');
    expect(normalizeSeverity(undefined)).toBe('off');
  });
  test('reads severity from a tuple', () => {
    expect(normalizeSeverity(['error', { allow: ['warn'] }])).toBe('error');
    expect(normalizeSeverity(['warn'])).toBe('warn');
  });
});

describe('ruleOptions', () => {
  test('returns tuple tail', () => {
    expect(ruleOptions(['error', { a: 1 }])).toStrictEqual([{ a: 1 }]);
  });
  test('returns empty for bare severity', () => {
    expect(ruleOptions('error')).toStrictEqual([]);
  });
});

describe('ruleDocsUrl', () => {
  test('namespaced rule', () => {
    expect(ruleDocsUrl('typescript/no-floating-promises')).toBe(
      'https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-floating-promises.html',
    );
  });
  test('unprefixed rule belongs to eslint', () => {
    expect(ruleDocsUrl('no-console')).toBe(
      'https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-console.html',
    );
  });
  test('jsx-a11y is remapped to jsx_a11y', () => {
    expect(ruleDocsUrl('jsx-a11y/alt-text')).toBe(
      'https://oxc.rs/docs/guide/usage/linter/rules/jsx_a11y/alt-text.html',
    );
  });
  test('react-perf is remapped to react_perf', () => {
    expect(ruleDocsUrl('react-perf/jsx-no-jsx-as-prop')).toBe(
      'https://oxc.rs/docs/guide/usage/linter/rules/react_perf/jsx-no-jsx-as-prop.html',
    );
  });
  test('tailwindcss has no oxc.rs page', () => {
    expect(ruleDocsUrl('tailwindcss/classnames-order')).toBeNull();
  });
});

// A miniature of the @k8o/oxc-config shape: base sets categories, typescript
// extends base, the consumer extends typescript and overrides a rule.
const base: LintNode = {
  plugins: ['eslint', 'oxc', 'unicorn'],
  categories: { correctness: 'error', style: 'off' },
  rules: { 'no-console': 'warn', eqeqeq: 'error' },
};
const typescript: LintNode = {
  extends: [base],
  plugins: ['eslint', 'oxc', 'unicorn', 'typescript'],
  rules: { 'typescript/no-explicit-any': 'error', 'no-console': 'error' },
};

describe('flattenExtends', () => {
  test('ancestors come before descendants', () => {
    const order = flattenExtends(typescript);
    expect(order[0]).toBe(base);
    expect(order[1]).toBe(typescript);
  });
});

describe('inferPresetLabel', () => {
  test('labels by most-derived plugin', () => {
    expect(inferPresetLabel(base)).toBe('base');
    expect(inferPresetLabel(typescript)).toBe('typescript');
    expect(inferPresetLabel({ plugins: ['eslint', 'react'] })).toBe('react');
    expect(inferPresetLabel({ plugins: ['nextjs'] })).toBe('nextjs');
    expect(inferPresetLabel({ plugins: ['jest', 'vitest'] })).toBe('test');
  });
  test('recognizes the tailwind JS plugin', () => {
    expect(inferPresetLabel({ jsPlugins: ['oxlint-tailwindcss'] })).toBe(
      'tailwind',
    );
  });
  test('recognizes the tailwind JS plugin registered under an alias', () => {
    expect(
      inferPresetLabel({
        jsPlugins: [{ name: 'tw', specifier: 'oxlint-tailwindcss' }],
      }),
    ).toBe('tailwind');
  });
  test('falls back to the dominant rule namespace', () => {
    expect(
      inferPresetLabel({
        rules: { 'foo/a': 'error', 'foo/b': 'warn', 'bar/c': 'off' },
      }),
    ).toBe('foo');
  });
});

describe('resolveBaseRules', () => {
  const lint: LintNode = {
    extends: [typescript],
    rules: { eqeqeq: 'off' },
  };

  test('flattens nested extends and applies last-wins + own rules', () => {
    const rules = resolveBaseRules(lint);
    const byId = Object.fromEntries(rules.map((r) => [r.id, r]));
    // base contributes no-console=warn, typescript raises it to error
    expect(byId['no-console']?.severity).toBe('error');
    expect(byId['no-console']?.source).toBe('typescript');
    // typescript-only rule survives
    expect(byId['typescript/no-explicit-any']?.severity).toBe('error');
    // own config turns eqeqeq off and is attributed to config
    expect(byId['eqeqeq']?.severity).toBe('off');
    expect(byId['eqeqeq']?.source).toBe('config');
  });

  test('attributes base-only rules to base', () => {
    const byId = Object.fromEntries(
      resolveBaseRules(lint).map((r) => [r.id, r]),
    );
    expect(byId['no-console']?.docsUrl).toContain('/eslint/no-console');
  });
});

describe('resolveCategories / resolvePlugins', () => {
  const lint: LintNode = { extends: [typescript] };
  test('categories merge from the extends chain', () => {
    expect(resolveCategories(lint)).toStrictEqual({
      correctness: 'error',
      style: 'off',
    });
  });
  test('plugins resolve to the most-derived set', () => {
    expect(resolvePlugins(lint)).toStrictEqual([
      'eslint',
      'oxc',
      'unicorn',
      'typescript',
    ]);
  });
});

describe('resolveEffective (with catalog)', () => {
  const lint: LintNode = {
    extends: [
      {
        plugins: ['eslint', 'unicorn'],
        categories: { correctness: 'error', style: 'off' },
        rules: { 'no-console': 'warn' },
      },
    ],
  };
  // no-console: explicitly set -> warn; no-debugger: via category -> error;
  // unicorn/no-null: via category 'style' -> off; unicorn/prefer-at: nursery,
  // unconfigured + not default-on -> off; unicorn/no-await: nursery but
  // default-on -> warn (oxlint enables it by default).
  const catalog: RuleMeta[] = [
    meta('no-console', 'suspicious'),
    meta('no-debugger', 'correctness'),
    meta('unicorn/no-null', 'style', { fixable: true }),
    meta('unicorn/prefer-at', 'nursery'),
    meta('unicorn/no-await', 'nursery', { defaultOn: true }),
  ];

  test('derives severity from rule, then category, then default', () => {
    const byId = Object.fromEntries(
      resolveEffective(lint, catalog).map((r) => [r.id, r]),
    );
    expect(byId['no-console']?.severity).toBe('warn');
    expect(byId['no-console']?.configured).toBe(true);
    expect(byId['no-debugger']?.severity).toBe('error');
    expect(byId['no-debugger']?.source).toBe('category: correctness');
    expect(byId['unicorn/no-null']?.severity).toBe('off');
    expect(byId['unicorn/no-null']?.source).toBe('category: style');
    expect(byId['unicorn/prefer-at']?.severity).toBe('off');
    expect(byId['unicorn/no-await']?.severity).toBe('warn');
    expect(byId['unicorn/no-await']?.source).toBe('default');
  });

  test('carries catalog metadata onto rules', () => {
    const byId = Object.fromEntries(
      resolveEffective(lint, catalog).map((r) => [r.id, r]),
    );
    expect(byId['unicorn/no-null']?.fixable).toBe(true);
    expect(byId['unicorn/no-null']?.plugin).toBe('unicorn');
    expect(byId['no-debugger']?.docsUrl).toBe('https://oxc.rs/no-debugger');
  });

  test('includes configured rules absent from the catalog', () => {
    const withTw: LintNode = {
      extends: [{ rules: { 'tailwindcss/no-arbitrary-value': 'error' } }],
    };
    const rules = resolveEffective(withTw, catalog);
    const tw = rules.find((r) => r.id === 'tailwindcss/no-arbitrary-value');
    expect(tw?.severity).toBe('error');
    expect(tw?.category).toBeNull();
  });
});

describe('resolveOverride', () => {
  test('enriches an override’s rules with catalog metadata and a source label', () => {
    const rules = resolveOverride(
      ['**/*.test.ts', '**/*.spec.ts'],
      { 'no-console': 'off', 'unicorn/no-null': 'error' },
      [meta('unicorn/no-null', 'style', { fixable: true })],
    );
    const byId = Object.fromEntries(rules.map((r) => [r.id, r]));
    expect(byId['no-console']?.severity).toBe('off');
    expect(byId['no-console']?.source).toBe(
      'override: **/*.test.ts, **/*.spec.ts',
    );
    expect(byId['unicorn/no-null']?.severity).toBe('error');
    expect(byId['unicorn/no-null']?.fixable).toBe(true);
    expect(byId['unicorn/no-null']?.category).toBe('style');
  });
});

describe('countPresetRules', () => {
  test('counts unique rule ids across the chain', () => {
    // base: no-console, eqeqeq (2) + typescript: no-explicit-any, no-console (no-console dup) => 3 unique
    expect(countPresetRules(typescript)).toBe(3);
  });
});
