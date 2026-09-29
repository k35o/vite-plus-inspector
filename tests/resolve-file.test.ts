import { compareRules, resolveForFile } from '../src/resolve-file.ts';
import type { FileOverride } from '../src/resolve-file.ts';
import { pluginOf } from '../src/rule-id.ts';
import type { EnrichedRule, Severity } from '../src/types.ts';

function rule(
  id: string,
  severity: Severity,
  extra: Partial<EnrichedRule> = {},
): EnrichedRule {
  return {
    id,
    severity,
    options: [],
    source: 'config',
    docsUrl: null,
    plugin: pluginOf(id),
    category: 'correctness',
    typeAware: false,
    fixable: false,
    defaultOn: false,
    configured: true,
    ...extra,
  };
}

function override(extra: Partial<FileOverride>): FileOverride {
  return {
    files: ['**'],
    excludeFiles: [],
    plugins: null,
    rules: [],
    ...extra,
  };
}

/** Whether an override with these patterns applies to the file. */
function applies(
  files: string[],
  file: string,
  excludeFiles: string[] = [],
): boolean {
  const { matchedOverrides } = resolveForFile(
    {
      plugins: ['eslint'],
      rules: [],
      resolve: { overrides: [override({ files, excludeFiles })] },
    },
    file,
  );
  return matchedOverrides.length === 1;
}

describe('which files an override applies to', () => {
  test('a pattern without a slash matches a file name in the config directory', () => {
    expect(applies(['*.test.ts'], 'x.test.ts')).toBe(true);
  });

  test('a pattern without a slash matches a file name at any depth', () => {
    expect(applies(['*.test.ts'], 'a/b/x.test.ts')).toBe(true);
  });

  test('a pattern without a slash does not match another file name', () => {
    expect(applies(['*.test.ts'], 'a/b/x.ts')).toBe(false);
  });

  test('a pattern with a slash matches from the config directory', () => {
    expect(applies(['a/*.ts'], 'a/x.ts')).toBe(true);
  });

  test('a pattern with a slash does not match deeper down', () => {
    expect(applies(['a/*.ts'], 'sub/a/x.ts')).toBe(false);
  });

  test('a leading ./ is not part of the pattern', () => {
    expect(applies(['./a/*.ts'], 'a/x.ts')).toBe(true);
  });

  test('a file name behind ./ matches in the config directory', () => {
    expect(applies(['./x.ts'], 'x.ts')).toBe(true);
  });

  test('a file name behind ./ does not match at depth', () => {
    expect(applies(['./x.ts'], 'a/x.ts')).toBe(false);
  });

  test('* stays within a directory', () => {
    expect(applies(['a/*.ts'], 'a/b/x.ts')).toBe(false);
  });

  test('* matches a file name that starts with a dot', () => {
    expect(applies(['a/*.ts'], 'a/.hidden.ts')).toBe(true);
  });

  test('**/ matches no directory at all', () => {
    expect(applies(['a/**/x.ts'], 'a/x.ts')).toBe(true);
  });

  test('**/ matches several directories', () => {
    expect(applies(['a/**/x.ts'], 'a/b/c/x.ts')).toBe(true);
  });

  test('a trailing ** matches everything below', () => {
    expect(applies(['a/**'], 'a/b/x.ts')).toBe(true);
  });

  test('** next to other characters matches like *', () => {
    expect(applies(['a**/c.ts'], 'ab/c.ts')).toBe(true);
  });

  test('** next to other characters stays within a directory', () => {
    expect(applies(['a**/c.ts'], 'a/b/c.ts')).toBe(false);
  });

  test('** that ends an alternative stays within a directory', () => {
    expect(applies(['{a/**,b/**}'], 'a/b/x.ts')).toBe(false);
  });

  test('**/ that opens an alternative matches several directories', () => {
    expect(applies(['{**/x.test.ts,b/*}'], 'a/b/x.test.ts')).toBe(true);
  });

  test('? matches one character', () => {
    expect(applies(['a/?.ts'], 'a/x.ts')).toBe(true);
  });

  test('? does not match a slash', () => {
    expect(applies(['a?b/c.ts'], 'a/b/c.ts')).toBe(false);
  });

  test('[xy] matches one of its characters', () => {
    expect(applies(['a/[xy].ts'], 'a/y.ts')).toBe(true);
  });

  test('[xy] does not match another character', () => {
    expect(applies(['a/[xy].ts'], 'a/z.ts')).toBe(false);
  });

  test('[a-c] matches a character in its range', () => {
    expect(applies(['a/[a-c].ts'], 'a/b.ts')).toBe(true);
  });

  test('[!x] matches a character it does not list', () => {
    expect(applies(['a/[!x].ts'], 'a/y.ts')).toBe(true);
  });

  test('[!x] does not match the character it lists', () => {
    expect(applies(['a/[!x].ts'], 'a/x.ts')).toBe(false);
  });

  test('a ] that opens the brackets is one of their characters', () => {
    expect(applies(['a/[]x].ts'], 'a/].ts')).toBe(true);
  });

  test('a range that runs backwards matches nothing', () => {
    expect(applies(['a/[z-a].ts'], 'a/m.ts')).toBe(false);
  });

  test('{a,b} matches either alternative', () => {
    expect(applies(['*.{test,spec}.ts'], 'a/x.spec.ts')).toBe(true);
  });

  test('{a,b} does not match anything else', () => {
    expect(applies(['*.{test,spec}.ts'], 'a/x.bench.ts')).toBe(false);
  });

  test('a dot matches only a dot', () => {
    expect(applies(['a/x.ts'], 'a/xats')).toBe(false);
  });

  test('a comma outside braces matches only a comma', () => {
    expect(applies(['a/x,y.ts'], 'a/x.ts')).toBe(false);
  });

  test('an escaped * matches an asterisk', () => {
    expect(applies(['a/\\*.ts'], 'a/*.ts')).toBe(true);
  });

  test('an escaped * matches nothing else', () => {
    expect(applies(['a/\\*.ts'], 'a/x.ts')).toBe(false);
  });

  test('characters that are special only to a RegExp match themselves', () => {
    expect(applies(['a/(x)+$.ts'], 'a/(x)+$.ts')).toBe(true);
  });

  test('a leading ! matches what the rest of the pattern does not', () => {
    expect(applies(['!a/**'], 'b/x.ts')).toBe(true);
  });

  test('a leading ! skips what the rest of the pattern matches', () => {
    expect(applies(['!a/**'], 'a/x.ts')).toBe(false);
  });

  test('a ! that opens a pattern without a slash is part of the file name', () => {
    expect(applies(['!*.test.ts'], 'a/!x.test.ts')).toBe(true);
  });

  test('a ! that opens a pattern without a slash does not negate it', () => {
    expect(applies(['!*.test.ts'], 'a/x.ts')).toBe(false);
  });

  test('any one of several patterns is enough', () => {
    expect(applies(['a/**', 'b/**'], 'b/x.ts')).toBe(true);
  });

  test('a file that excludeFiles matches is skipped', () => {
    expect(applies(['*.test.ts'], 'gen/x.test.ts', ['gen/**'])).toBe(false);
  });

  test('a file path may be typed with a leading ./', () => {
    expect(applies(['a/*.ts'], './a/x.ts')).toBe(true);
  });
});

describe('resolveForFile', () => {
  const base = {
    plugins: ['eslint', 'unicorn'],
    rules: [
      rule('no-console', 'warn'),
      rule('no-debugger', 'error'),
      rule('promise/no-new-statics', 'off', {
        source: 'plugin disabled',
        configured: false,
        pluginBaseline: { severity: 'warn', source: 'default' },
      }),
      rule('promise/avoid-new', 'off', {
        source: 'plugin disabled',
        category: 'style',
        configured: false,
      }),
    ],
  };
  const promise = ['eslint', 'promise'];

  function resolved(overrides: FileOverride[], file = 'a/x.ts') {
    const { rules } = resolveForFile({ ...base, resolve: { overrides } }, file);
    return Object.fromEntries(
      rules.map((r) => [r.id, `${r.severity} (${r.source})`]),
    );
  }

  test('a file no override matches gets the base rules', () => {
    expect(
      resolved([
        override({ files: ['b/**'], rules: [rule('no-console', 'off')] }),
      ]),
    ).toStrictEqual({
      'no-console': 'warn (config)',
      'no-debugger': 'error (config)',
      'promise/no-new-statics': 'off (plugin disabled)',
      'promise/avoid-new': 'off (plugin disabled)',
    });
  });

  test('names the overrides that matched', () => {
    const { matchedOverrides } = resolveForFile(
      {
        ...base,
        resolve: {
          overrides: [
            override({ files: ['a/**', '*.test.ts'] }),
            override({ files: ['b/**'] }),
            override({ files: ['*.ts'] }),
          ],
        },
      },
      'a/x.ts',
    );
    expect(matchedOverrides).toStrictEqual(['a/**, *.test.ts', '*.ts']);
  });

  test('a matching override sets its rules over the base', () => {
    expect(
      resolved([
        override({
          rules: [rule('no-console', 'off', { source: 'override: **' })],
        }),
      ])['no-console'],
    ).toBe('off (override: **)');
  });

  test('a rule the override does not name keeps its base severity', () => {
    expect(
      resolved([override({ rules: [rule('no-console', 'off')] })])[
        'no-debugger'
      ],
    ).toBe('error (config)');
  });

  test('of two matching overrides the later one wins', () => {
    expect(
      resolved([
        override({
          rules: [rule('no-console', 'off', { source: 'override: first' })],
        }),
        override({
          rules: [rule('no-console', 'error', { source: 'override: second' })],
        }),
      ])['no-console'],
    ).toBe('error (override: second)');
  });

  test('a plugin an override enables brings its category baseline', () => {
    expect(
      resolved([override({ plugins: promise })])['promise/no-new-statics'],
    ).toBe('warn (default)');
  });

  test('a rule on by its baseline no longer records the baseline', () => {
    const { rules } = resolveForFile(
      { ...base, resolve: { overrides: [override({ plugins: promise })] } },
      'a/x.ts',
    );
    expect(rules.find((r) => r.id === 'promise/no-new-statics')).toStrictEqual({
      id: 'promise/no-new-statics',
      severity: 'warn',
      options: [],
      source: 'default',
      docsUrl: null,
      plugin: 'promise',
      category: 'correctness',
      typeAware: false,
      fixable: false,
      defaultOn: false,
      configured: false,
    });
  });

  test('a rule no category covers stays off in a plugin an override enables', () => {
    expect(
      resolved([override({ plugins: promise })])['promise/avoid-new'],
    ).toBe('off (plugin disabled)');
  });

  test('the rules of the override that enables a plugin win over its baseline', () => {
    expect(
      resolved([
        override({
          plugins: promise,
          rules: [
            rule('promise/no-new-statics', 'off', { source: 'override: **' }),
          ],
        }),
      ])['promise/no-new-statics'],
    ).toBe('off (override: **)');
  });

  test('a baseline is not brought twice', () => {
    expect(
      resolved([
        override({
          plugins: promise,
          rules: [
            rule('promise/no-new-statics', 'off', { source: 'override: **' }),
          ],
        }),
        override({ plugins: promise }),
      ])['promise/no-new-statics'],
    ).toBe('off (override: **)');
  });

  test('an override that names every enabled plugin brings no baseline', () => {
    expect(
      resolved([override({ plugins: ['eslint', 'unicorn', 'promise'] })])[
        'promise/no-new-statics'
      ],
    ).toBe('off (plugin disabled)');
  });

  test('an override that names every enabled plugin still sets its own rules', () => {
    expect(
      resolved([
        override({
          plugins: ['eslint', 'unicorn', 'promise'],
          rules: [
            rule('promise/avoid-new', 'error', { source: 'override: **' }),
          ],
        }),
      ])['promise/avoid-new'],
    ).toBe('error (override: **)');
  });

  test('a later override brings the baseline of a plugin an earlier one enabled', () => {
    expect(
      resolved([
        override({ plugins: ['eslint', 'unicorn', 'promise'] }),
        override({ plugins: ['eslint'] }),
      ])['promise/no-new-statics'],
    ).toBe('warn (default)');
  });

  test('a baseline turns a rule back on that an earlier override turned off', () => {
    expect(
      resolved([
        override({
          plugins: ['eslint', 'unicorn', 'promise'],
          rules: [
            rule('promise/no-new-statics', 'off', { source: 'override: **' }),
          ],
        }),
        override({ plugins: promise }),
      ])['promise/no-new-statics'],
    ).toBe('warn (default)');
  });

  test('a baseline leaves a rule alone that an earlier override turned on', () => {
    expect(
      resolved([
        override({
          plugins: ['eslint', 'unicorn', 'promise'],
          rules: [
            rule('promise/no-new-statics', 'error', {
              source: 'override: **',
            }),
          ],
        }),
        override({ plugins: promise }),
      ])['promise/no-new-statics'],
    ).toBe('error (override: **)');
  });

  test('an override that does not match enables no plugin', () => {
    expect(
      resolved([
        override({ files: ['b/**'], plugins: promise }),
        override({ files: ['a/**'] }),
      ])['promise/no-new-statics'],
    ).toBe('off (plugin disabled)');
  });
});

function sorted(rules: EnrichedRule[]): string[] {
  return rules.toSorted(compareRules).map((r) => r.id);
}

describe('compareRules', () => {
  test('errors come before warnings, and warnings before rules that are off', () => {
    expect(
      sorted([rule('a', 'off'), rule('b', 'warn'), rule('c', 'error')]),
    ).toStrictEqual(['c', 'b', 'a']);
  });

  test('at one severity, configured rules come first', () => {
    expect(
      sorted([rule('a', 'warn', { configured: false }), rule('b', 'warn')]),
    ).toStrictEqual(['b', 'a']);
  });

  test('otherwise rules are in the order of their ids', () => {
    expect(sorted([rule('b', 'warn'), rule('a', 'warn')])).toStrictEqual([
      'a',
      'b',
    ]);
  });
});
