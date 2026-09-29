import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { loadCatalog, parseCatalog } from '../src/catalog.ts';

function raw(fix: string): string {
  return JSON.stringify([
    {
      scope: 'unicorn',
      value: 'no-null',
      category: 'style',
      type_aware: false,
      fix,
      default: false,
      docs_url:
        'https://oxc.rs/docs/guide/usage/linter/rules/unicorn/no-null.html',
    },
  ]);
}

describe('parseCatalog', () => {
  test('a rule without a fix is not fixable', () => {
    expect(parseCatalog(raw('none'))[0]?.fixable).toBe(false);
  });

  test('a rule whose fix is not implemented yet is not fixable', () => {
    expect(parseCatalog(raw('pending'))[0]?.fixable).toBe(false);
  });

  test('a rule with a fix is fixable', () => {
    expect(parseCatalog(raw('fixable_fix'))[0]?.fixable).toBe(true);
  });

  test('skips what the project’s config printed while it was loaded', () => {
    const stdout = `loading config for development\n${raw('none')
      .replace('[', '[\n')
      .replace(/\]$/u, '\n]')}\n`;
    expect(parseCatalog(stdout)[0]?.id).toBe('unicorn/no-null');
  });

  test('rejects output that is not JSON', () => {
    expect(() =>
      parseCatalog('Failed to parse oxlint configuration file.'),
    ).toThrow(SyntaxError);
  });
});

describe('loadCatalog for a project with its own vite-plus', () => {
  let project: string;

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), 'vpi-'));
    const vitePlus = join(project, 'node_modules/vite-plus');
    mkdirSync(join(vitePlus, 'bin'), { recursive: true });
    writeFileSync(
      join(vitePlus, 'package.json'),
      JSON.stringify({ name: 'vite-plus', bin: { vp: './bin/vp' } }),
    );
    writeFileSync(
      join(vitePlus, 'bin/vp'),
      `console.log(JSON.stringify([{ scope: 'typescript', value: 'only-here', category: 'nursery', type_aware: true, fix: 'none', default: true, docs_url: 'https://example.test/only-here.html' }], null, 2));`,
    );
    writeFileSync(join(project, 'vite.config.ts'), 'export default {};\n');
  });

  afterEach(() => {
    rmSync(project, { recursive: true, force: true });
  });

  test('the catalog is what that vite-plus prints', async () => {
    expect(await loadCatalog(join(project, 'vite.config.ts'))).toStrictEqual([
      {
        id: 'typescript/only-here',
        plugin: 'typescript',
        category: 'nursery',
        typeAware: true,
        fixable: false,
        defaultOn: true,
        docsUrl: 'https://example.test/only-here.html',
      },
    ]);
  });
});

describe('loadCatalog', () => {
  const configPath = resolve(import.meta.dirname, '../vite.config.ts');

  test('reads every rule from the vite-plus installed in the project', async () => {
    const catalog = await loadCatalog(configPath);
    expect(catalog.length).toBeGreaterThan(800);
  });

  test('names a rule the way a lint config refers to it', async () => {
    const byId = new Map(
      (await loadCatalog(configPath)).map((rule) => [rule.id, rule]),
    );
    expect(byId.get('jsx-a11y/alt-text')).toStrictEqual({
      id: 'jsx-a11y/alt-text',
      plugin: 'jsx-a11y',
      category: 'correctness',
      typeAware: false,
      fixable: false,
      defaultOn: false,
      docsUrl:
        'https://oxc.rs/docs/guide/usage/linter/rules/jsx_a11y/alt-text.html',
    });
    expect(byId.get('no-console')?.plugin).toBe('eslint');
    expect(byId.get('react-perf/jsx-no-jsx-as-prop')?.plugin).toBe(
      'react-perf',
    );
  });

  test('reports why the project’s lint config was refused', async () => {
    const invalid = resolve(
      import.meta.dirname,
      'fixtures/invalid-lint/vite.config.ts',
    );
    await expect(loadCatalog(invalid)).rejects.toThrow('nope-not-a-plugin');
  });
});
