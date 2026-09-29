import type { RuleMeta } from '../src/catalog.ts';
import {
  countPresetRules,
  flattenExtends,
  inferPresetLabel,
  normalizeSeverity,
  resolveCategories,
  resolveEffective,
  resolveOverrides,
  resolvePlugins,
  ruleDocsUrl,
  ruleOptions,
} from '../src/resolve.ts';
import { pluginOf } from '../src/rule-id.ts';
import type { EnrichedRule, LintNode } from '../src/types.ts';

function meta(
  id: string,
  category: string,
  extra: Partial<RuleMeta> = {},
): RuleMeta {
  return {
    id,
    plugin: pluginOf(id),
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
  test.each([
    'tailwindcss/classnames-order',
    'regexp/no-dupe-disjunctions',
    'playwright/no-focused-test',
    'storybook/default-exports',
    '@acme/rules/no-foo',
  ])('%s, a rule of a JS plugin, has no oxc.rs page', (id) => {
    expect(ruleDocsUrl(id)).toBeNull();
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

/** The rules by id, each as `severity (source)`. */
function states(rules: EnrichedRule[]): Record<string, string> {
  return Object.fromEntries(
    rules.map((r) => [r.id, `${r.severity} (${r.source})`]),
  );
}

describe('resolveCategories', () => {
  test('categories merge from the extends chain', () => {
    expect(resolveCategories({ extends: [typescript] })).toStrictEqual({
      correctness: 'error',
      style: 'off',
    });
  });

  test('a category set again down the chain takes the later severity', () => {
    expect(
      resolveCategories({
        categories: { style: 'warn' },
        extends: [{ categories: { correctness: 'error', style: 'error' } }],
      }),
    ).toStrictEqual({ correctness: 'error', style: 'warn' });
  });
});

describe('resolvePlugins', () => {
  test('a config that names no plugins enables the default ones', () => {
    expect(resolvePlugins({})).toStrictEqual([
      'eslint',
      'unicorn',
      'typescript',
      'oxc',
    ]);
  });

  test('every config of the extends chain adds the plugins it names', () => {
    expect(
      resolvePlugins({
        plugins: ['promise'],
        extends: [{ plugins: ['import'] }],
      }),
    ).toStrictEqual(['eslint', 'import', 'promise']);
  });

  test('a config of the chain that names no plugins adds the default ones', () => {
    expect(
      resolvePlugins({ extends: [{ plugins: ['import'] }] }),
    ).toStrictEqual(['eslint', 'import', 'unicorn', 'typescript', 'oxc']);
  });

  test('an empty plugin list adds nothing', () => {
    expect(
      resolvePlugins({ plugins: [], extends: [{ plugins: ['import'] }] }),
    ).toStrictEqual(['eslint', 'import']);
  });

  test('a plugin named by an alias is the plugin itself', () => {
    expect(resolvePlugins({ plugins: ['react-hooks', 'react'] })).toStrictEqual(
      ['eslint', 'react'],
    );
  });
});

describe('resolveEffective', () => {
  const catalog: RuleMeta[] = [
    meta('no-console', 'suspicious'),
    meta('no-debugger', 'correctness', { defaultOn: true }),
    meta('no-unused-vars', 'correctness', { defaultOn: true }),
    meta('unicorn/no-null', 'style', { fixable: true }),
    meta('react/jsx-key', 'correctness'),
    meta('react/no-danger', 'restriction'),
    meta('typescript/no-explicit-any', 'restriction'),
  ];

  function resolved(lint: LintNode): Record<string, string> {
    return states(resolveEffective(lint, catalog));
  }

  test('a rule takes the severity its entry gives it', () => {
    expect(resolved({ rules: { 'no-console': 'warn' } })['no-console']).toBe(
      'warn (config)',
    );
  });

  test('an entry of an extended preset is attributed to the preset', () => {
    expect(
      resolved({ extends: [{ rules: { 'no-console': 'warn' } }] })[
        'no-console'
      ],
    ).toBe('warn (preset)');
  });

  test('the config’s own entry wins over the presets it extends', () => {
    expect(
      resolved({
        rules: { 'no-console': 'off' },
        extends: [{ rules: { 'no-console': 'error' } }],
      })['no-console'],
    ).toBe('off (config)');
  });

  test('a preset wins over the preset it extends', () => {
    const lint: LintNode = { extends: [typescript] };
    expect(resolved(lint)['no-console']).toBe('error (typescript)');
  });

  test('a rule without an entry takes the severity of its category', () => {
    expect(
      resolved({ categories: { suspicious: 'error' } })['no-console'],
    ).toBe('error (category: suspicious)');
  });

  test('an entry wins over the category, wherever the category is set', () => {
    expect(
      resolved({
        categories: { suspicious: 'error' },
        extends: [{ rules: { 'no-console': 'off' } }],
      })['no-console'],
    ).toBe('off (preset)');
  });

  test('a correctness rule warns when no config sets the category', () => {
    expect(resolved({})['no-debugger']).toBe('warn (default)');
  });

  test('a correctness rule of any enabled plugin warns by default', () => {
    expect(resolved({ plugins: ['react'] })['react/jsx-key']).toBe(
      'warn (default)',
    );
  });

  test('setting another category leaves correctness rules warning', () => {
    expect(resolved({ categories: { style: 'error' } })['no-debugger']).toBe(
      'warn (default)',
    );
  });

  test('a correctness rule is off when the category is turned off', () => {
    expect(
      resolved({ categories: { correctness: 'off' } })['no-debugger'],
    ).toBe('off (category: correctness)');
  });

  test('a rule outside correctness is off when nothing sets it', () => {
    expect(resolved({})['no-console']).toBe('off (off)');
  });

  test('a category does not turn on the rules of a plugin that is not enabled', () => {
    expect(
      resolved({ plugins: ['unicorn'], categories: { correctness: 'error' } })[
        'react/jsx-key'
      ],
    ).toBe('off (plugin disabled)');
  });

  test('an entry does not turn on a rule of a plugin that is not enabled', () => {
    expect(
      resolved({
        plugins: ['unicorn'],
        rules: { 'react/jsx-key': ['error', { checkFragmentShorthand: true }] },
      })['react/jsx-key'],
    ).toBe('off (plugin disabled)');
  });

  test('a dropped entry does not count as configured', () => {
    const rules = resolveEffective(
      { plugins: ['unicorn'], rules: { 'react/jsx-key': 'error' } },
      catalog,
    );
    expect(rules.find((r) => r.id === 'react/jsx-key')).toMatchObject({
      configured: false,
      options: [],
    });
  });

  test('an eslint rule is on without eslint being named', () => {
    expect(
      resolved({ plugins: ['unicorn'], rules: { 'no-console': 'error' } })[
        'no-console'
      ],
    ).toBe('error (config)');
  });

  test('a plugin enabled by an extended preset turns its rules on', () => {
    expect(
      resolved({
        plugins: [],
        extends: [{ plugins: ['react'], rules: { 'react/no-danger': 'warn' } }],
      })['react/no-danger'],
    ).toBe('warn (react)');
  });

  test('an entry written with an alias sets the rule', () => {
    expect(
      resolved({ rules: { '@typescript-eslint/no-explicit-any': 'error' } })[
        'typescript/no-explicit-any'
      ],
    ).toBe('error (config)');
  });

  test('the last entry wins, whichever way each is written', () => {
    expect(
      resolved({
        rules: { '@typescript-eslint/no-explicit-any': 'off' },
        extends: [{ rules: { 'typescript/no-explicit-any': 'error' } }],
      })['typescript/no-explicit-any'],
    ).toBe('off (config)');
  });

  test('a typescript entry sets the eslint rule that stands in for it', () => {
    expect(
      resolved({
        plugins: [],
        rules: { 'typescript/no-unused-vars': 'error' },
      })['no-unused-vars'],
    ).toBe('error (config)');
  });

  test('lists every rule once', () => {
    expect(
      Object.keys(
        resolved({ rules: { '@typescript-eslint/no-explicit-any': 'error' } }),
      ).toSorted(),
    ).toStrictEqual([
      'no-console',
      'no-debugger',
      'no-unused-vars',
      'react/jsx-key',
      'react/no-danger',
      'typescript/no-explicit-any',
      'unicorn/no-null',
    ]);
  });

  test('carries catalog metadata onto rules', () => {
    const rules = resolveEffective({}, catalog);
    expect(rules.find((r) => r.id === 'unicorn/no-null')).toStrictEqual({
      id: 'unicorn/no-null',
      severity: 'off',
      options: [],
      source: 'off',
      docsUrl: 'https://oxc.rs/unicorn/no-null',
      plugin: 'unicorn',
      category: 'style',
      typeAware: false,
      fixable: true,
      defaultOn: false,
      configured: false,
    });
  });

  test('a rule of a JS plugin is on without a plugin being named for it', () => {
    const rules = resolveEffective(
      { rules: { 'tailwindcss/no-arbitrary-value': ['error', { a: 1 }] } },
      catalog,
    );
    expect(
      rules.find((r) => r.id === 'tailwindcss/no-arbitrary-value'),
    ).toStrictEqual({
      id: 'tailwindcss/no-arbitrary-value',
      severity: 'error',
      options: [{ a: 1 }],
      source: 'config',
      docsUrl: null,
      plugin: 'tailwindcss',
      category: null,
      typeAware: false,
      fixable: false,
      defaultOn: false,
      configured: true,
    });
  });

  /** What a rule records while only the unicorn plugin is enabled. */
  function baseline(lint: LintNode, id: string) {
    return resolveEffective({ plugins: ['unicorn'], ...lint }, catalog).find(
      (r) => r.id === id,
    )?.pluginBaseline;
  }

  describe('a rule of a plugin that is not enabled', () => {
    test('records the default it takes once an override enables the plugin', () => {
      expect(baseline({}, 'react/jsx-key')).toStrictEqual({
        severity: 'warn',
        source: 'default',
      });
    });

    test('records the category severity it takes then', () => {
      expect(
        baseline({ categories: { restriction: 'error' } }, 'react/no-danger'),
      ).toStrictEqual({ severity: 'error', source: 'category: restriction' });
    });

    test('records nothing when its category is off', () => {
      expect(
        baseline({ categories: { correctness: 'off' } }, 'react/jsx-key'),
      ).toBeUndefined();
    });

    test('records nothing when no config sets its category', () => {
      expect(baseline({}, 'react/no-danger')).toBeUndefined();
    });
  });

  describe('without a catalog', () => {
    test('lists the rules the config declares', () => {
      expect(
        states(
          resolveEffective(
            { extends: [typescript], rules: { eqeqeq: 'off' } },
            [],
          ),
        ),
      ).toStrictEqual({
        'no-console': 'error (typescript)',
        'typescript/no-explicit-any': 'error (typescript)',
        eqeqeq: 'off (config)',
      });
    });

    test('a declared rule of a plugin that is not enabled is off', () => {
      expect(
        states(
          resolveEffective(
            { plugins: ['unicorn'], rules: { 'react/jsx-key': 'error' } },
            [],
          ),
        ),
      ).toStrictEqual({ 'react/jsx-key': 'off (plugin disabled)' });
    });

    test('links a rule of a built-in plugin to its oxc.rs page', () => {
      expect(
        resolveEffective({ rules: { 'no-console': 'warn' } }, [])[0]?.docsUrl,
      ).toBe(
        'https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-console.html',
      );
    });
  });

  test('lists errors first, then warnings, then the rules that are off', () => {
    expect(
      resolveEffective(
        { rules: { 'unicorn/no-null': 'error', 'no-console': 'warn' } },
        catalog,
      ).map((r) => r.id),
    ).toStrictEqual([
      'unicorn/no-null',
      'no-console',
      'no-debugger',
      'no-unused-vars',
      'react/jsx-key',
      'react/no-danger',
      'typescript/no-explicit-any',
    ]);
  });
});

describe('resolveOverrides', () => {
  const catalog: RuleMeta[] = [
    meta('no-console', 'suspicious'),
    meta('unicorn/no-null', 'style', { fixable: true }),
    meta('vitest/no-focused-tests', 'correctness'),
    meta('react/jsx-key', 'correctness'),
  ];

  test('an override of an extended preset comes before the config’s own', () => {
    expect(
      resolveOverrides(
        {
          overrides: [{ files: ['root/**'] }],
          extends: [
            {
              overrides: [{ files: ['first/**'] }],
              extends: [{ overrides: [{ files: ['grand/**'] }] }],
            },
            { overrides: [{ files: ['second/**'] }] },
          ],
        },
        catalog,
      ).map((o) => o.files),
    ).toStrictEqual([['grand/**'], ['first/**'], ['second/**'], ['root/**']]);
  });

  test('carries the files an override excludes', () => {
    expect(
      resolveOverrides(
        { overrides: [{ files: ['*.ts'], excludeFiles: ['gen/**'] }] },
        catalog,
      )[0]?.excludeFiles,
    ).toStrictEqual(['gen/**']);
  });

  test('an override that names plugins enables them next to eslint', () => {
    expect(
      resolveOverrides(
        { overrides: [{ files: ['*.ts'], plugins: ['jsx_a11y', 'vitest'] }] },
        catalog,
      )[0]?.plugins,
    ).toStrictEqual(['eslint', 'jsx-a11y', 'vitest']);
  });

  test('an override that names no plugins has none of its own', () => {
    expect(
      resolveOverrides({ overrides: [{ files: ['*.ts'] }] }, catalog)[0]
        ?.plugins,
    ).toBeNull();
  });

  function rulesOf(lint: LintNode): Record<string, string> {
    return states(resolveOverrides(lint, catalog)[0]?.rules ?? []);
  }

  test('sets a rule of a plugin the config enables', () => {
    expect(
      rulesOf({
        plugins: ['unicorn'],
        overrides: [{ files: ['*.ts'], rules: { 'unicorn/no-null': 'error' } }],
      }),
    ).toStrictEqual({ 'unicorn/no-null': 'error (override: *.ts)' });
  });

  test('sets a rule of a plugin the override enables itself', () => {
    expect(
      rulesOf({
        plugins: [],
        overrides: [
          {
            files: ['*.test.ts', '*.spec.ts'],
            plugins: ['vitest'],
            rules: { 'vitest/no-focused-tests': 'error' },
          },
        ],
      }),
    ).toStrictEqual({
      'vitest/no-focused-tests': 'error (override: *.test.ts, *.spec.ts)',
    });
  });

  test('drops a rule of a plugin that neither of them enables', () => {
    expect(
      rulesOf({
        plugins: [],
        overrides: [
          {
            files: ['*.ts'],
            plugins: ['vitest'],
            rules: { 'react/jsx-key': 'error', 'no-console': 'off' },
          },
        ],
      }),
    ).toStrictEqual({ 'no-console': 'off (override: *.ts)' });
  });

  test('drops a rule of a plugin that only another override enables', () => {
    expect(
      resolveOverrides(
        {
          plugins: [],
          overrides: [
            { files: ['*.ts'], plugins: ['vitest'] },
            { files: ['*.ts'], rules: { 'vitest/no-focused-tests': 'error' } },
          ],
        },
        catalog,
      ).map((o) => o.rules),
    ).toStrictEqual([[], []]);
  });

  test('keeps a rule of a JS plugin', () => {
    expect(
      rulesOf({
        plugins: [],
        overrides: [
          { files: ['*.ts'], rules: { 'regexp/no-dupe-disjunctions': 'warn' } },
        ],
      }),
    ).toStrictEqual({ 'regexp/no-dupe-disjunctions': 'warn (override: *.ts)' });
  });

  test('sets a rule written with an alias', () => {
    expect(
      rulesOf({
        plugins: [],
        overrides: [
          {
            files: ['*.tsx'],
            plugins: ['react'],
            rules: { 'react-hooks/jsx-key': 'off' },
          },
        ],
      }),
    ).toStrictEqual({ 'react/jsx-key': 'off (override: *.tsx)' });
  });

  test('carries catalog metadata and options onto the rules', () => {
    expect(
      resolveOverrides(
        {
          overrides: [
            {
              files: ['*.ts'],
              rules: {
                'unicorn/no-null': ['warn', { checkStrictEquality: true }],
              },
            },
          ],
        },
        catalog,
      )[0]?.rules,
    ).toStrictEqual([
      {
        id: 'unicorn/no-null',
        severity: 'warn',
        options: [{ checkStrictEquality: true }],
        source: 'override: *.ts',
        docsUrl: 'https://oxc.rs/unicorn/no-null',
        plugin: 'unicorn',
        category: 'style',
        typeAware: false,
        fixable: true,
        defaultOn: false,
        configured: true,
      },
    ]);
  });
});

describe('countPresetRules', () => {
  test('counts unique rule ids across the chain', () => {
    // base: no-console, eqeqeq (2) + typescript: no-explicit-any, no-console (no-console dup) => 3 unique
    expect(countPresetRules(typescript)).toBe(3);
  });
});
