import { runInNewContext } from 'node:vm';

import { buildHtml } from '../src/build-html.ts';
import type { RuleMeta } from '../src/catalog.ts';
import { buildInspectorData } from '../src/model.ts';
import type { LintNode, VitePlusConfig } from '../src/types.ts';

type El = {
  innerHTML: string;
  textContent: string;
  value: string;
  listeners: Record<string, () => void>;
  addEventListener: (type: string, fn: () => void) => void;
};

/** Runs the page's own scripts against a DOM that only stores what is written. */
function open(config: VitePlusConfig, catalog?: RuleMeta[]) {
  const html = buildHtml(
    buildInspectorData(config, '/p/vite.config.ts', catalog),
  );
  const elements = new Map<string, El>();
  const el = (id: string): El => {
    let found = elements.get(id);
    if (!found) {
      const listeners: Record<string, () => void> = {};
      found = {
        innerHTML: '',
        textContent: '',
        value: '',
        listeners,
        addEventListener: (type, fn) => {
          listeners[type] = fn;
        },
      };
      elements.set(id, found);
    }
    return found;
  };
  const context: Record<string, unknown> = {
    document: {
      documentElement: { dataset: {} },
      getElementById: el,
      querySelectorAll: () => [],
      addEventListener() {},
    },
    localStorage: { getItem: () => null, setItem() {} },
    location: { protocol: 'file:' },
    // The page debounces input; run the handler at once.
    setTimeout: (fn: () => void) => {
      fn();
    },
    clearTimeout() {},
  };
  context['window'] = context;
  for (const [, source] of html.matchAll(/<script>([\s\S]*?)<\/script>/gu)) {
    runInNewContext(source as string, context);
  }
  return {
    el,
    // The view-model was created in the page's realm; compare a local copy.
    data: structuredClone(context['__INSPECTOR__']) as { staged: unknown },
    go: context['__go'] as (section: string) => void,
  };
}

function typecheck(): string {
  return 'tsc';
}

function section(config: VitePlusConfig, id: string): string {
  const page = open(config);
  page.go(id);
  return page.el('content').innerHTML;
}

function resolveStatus(file: string): string {
  const page = open({
    lint: {
      overrides: [
        {
          files: ['**/*.test.ts'],
          excludeFiles: ['src/gen.test.ts'],
          rules: { 'no-debugger': 'off' },
        },
      ],
    },
  });
  page.go('lint');
  page.el('resolve-input').value = file;
  page.el('resolve-input').listeners['input']?.();
  return page.el('resolve-status').innerHTML;
}

const catalog: RuleMeta[] = [
  {
    id: 'promise/no-new-statics',
    plugin: 'promise',
    category: 'correctness',
    typeAware: false,
    fixable: true,
    defaultOn: false,
    docsUrl: 'https://oxc.rs/promise/no-new-statics',
  },
  {
    id: 'typescript/no-floating-promises',
    plugin: 'typescript',
    category: 'correctness',
    typeAware: true,
    fixable: false,
    defaultOn: true,
    docsUrl: 'https://oxc.rs/typescript/no-floating-promises',
  },
];

/** The table row of a rule in the lint section, once `file` is typed in. */
function ruleRow(lint: LintNode, id: string, file = ''): string {
  const page = open({ lint }, catalog);
  page.go('lint');
  page.el('resolve-input').value = file;
  page.el('resolve-input').listeners['input']?.();
  const rows = page.el('rules-container').innerHTML.split('<tr ');
  return rows.find((row) => row.startsWith(`data-name="${id}"`)) ?? '';
}

describe('page', () => {
  test('a config string that closes the script tag stays inside the view-model', () => {
    const page = open({ staged: { '*.ts': 'echo </script><b>' } });
    expect(page.data.staged).toStrictEqual({ '*.ts': 'echo </script><b>' });
  });

  test('a staged task function reaches the page by name', () => {
    expect(open({ staged: { '*.ts': typecheck } }).data.staged).toStrictEqual({
      '*.ts': '[Function: typecheck]',
    });
  });

  test('a run task shows its commands in the order they run', () => {
    expect(
      section({ run: { tasks: { check: ['vp lint', 'vp build'] } } }, 'run'),
    ).toContain(
      '<div>vp lint</div><div><span class="text-muted">&amp;&amp; </span>vp build</div>',
    );
  });

  test('a run task shows the cache settings that turn tracking off', () => {
    expect(
      section(
        {
          run: {
            tasks: { report: { command: 'node r.mjs', cache: { output: [] } } },
          },
        },
        'run',
      ),
    ).toContain('cache.output: []');
  });

  test('a run block without tasks says so in the overview', () => {
    expect(section({ run: {} }, 'overview')).toContain(
      '<div class="overview-value" style="color:var(--text)">0 tasks</div>',
    );
  });

  test('a run block without tasks says so in its section', () => {
    expect(section({ run: {} }, 'run')).toContain(
      '<div class="empty">No tasks</div>',
    );
  });

  test('text from the config is shown as text, not as markup', () => {
    expect(
      section(
        {
          create: {
            templates: [
              {
                name: 'c',
                description: '<img src=x onerror=1>',
                template: 't',
              },
            ],
          },
        },
        'create',
      ),
    ).toContain('<td>&lt;img src=x onerror=1&gt;</td>');
  });

  test('a list option shows its items', () => {
    expect(
      section(
        { pack: { entry: 'src/index.ts', format: ['esm', 'cjs'] } },
        'pack',
      ),
    ).toContain(
      '<td><span class="text-muted">[&quot;esm&quot;,&quot;cjs&quot;]</span></td>',
    );
  });

  test('a test project given as a glob is listed', () => {
    expect(section({ test: { projects: ['packages/*'] } }, 'test')).toContain(
      '<div class="card-header">Projects</div><div style="padding:10px 14px;border-bottom:1px solid var(--border)"><div class="mono">packages/*</div></div></div>',
    );
  });

  test('options set beside test projects are shown after them', () => {
    expect(
      section({ test: { globals: true, projects: ['packages/*'] } }, 'test'),
    ).toContain(
      '<div class="mono">packages/*</div></div></div><div class="card"><div class="card-header">Options</div><table><tbody><tr><td class="mono text-blue" style="width:200px">globals</td><td><span class="text-green">true</span></td></tr></tbody></table></div>',
    );
  });

  test('a test block with nothing but projects has no options card', () => {
    expect(
      section({ test: { projects: ['packages/*'] } }, 'test'),
    ).not.toContain('Options');
  });

  test('an override applies to a file its files pattern matches', () => {
    expect(resolveStatus('src/a.test.ts')).toBe(
      'Matched overrides: <span class="tag">**/*.test.ts</span>',
    );
  });

  test('an override skips a file its excludeFiles pattern matches', () => {
    expect(resolveStatus('src/gen.test.ts')).toBe(
      'No overrides matched — base config applies.',
    );
  });

  const enablesPromise: LintNode = {
    overrides: [{ files: ['tests/**'], plugins: ['promise'] }],
  };

  test('a rule of a plugin that is not enabled is off', () => {
    expect(ruleRow(enablesPromise, 'promise/no-new-statics')).toContain(
      'data-src="plugin disabled" data-sev="off"',
    );
  });

  test('a rule is on for a file whose override enables its plugin', () => {
    expect(
      ruleRow(enablesPromise, 'promise/no-new-statics', 'tests/a.test.ts'),
    ).toContain('data-src="default" data-sev="warn"');
  });

  test('a rule stays off for a file the override does not match', () => {
    expect(
      ruleRow(enablesPromise, 'promise/no-new-statics', 'src/a.ts'),
    ).toContain('data-src="plugin disabled" data-sev="off"');
  });

  test('the rules resolved for a file list the enabled ones first', () => {
    const page = open({ lint: enablesPromise }, [
      ...catalog,
      {
        id: 'promise/avoid-new',
        plugin: 'promise',
        category: 'style',
        typeAware: false,
        fixable: false,
        defaultOn: false,
        docsUrl: 'https://oxc.rs/promise/avoid-new',
      },
    ]);
    page.go('lint');
    page.el('resolve-input').value = 'tests/a.test.ts';
    page.el('resolve-input').listeners['input']?.();
    expect(
      [
        ...page
          .el('rules-container')
          .innerHTML.matchAll(/data-name="(?<id>[^"]+)"/gu),
      ].map((match) => match.groups?.['id']),
    ).toStrictEqual([
      'promise/no-new-statics',
      'typescript/no-floating-promises',
      'promise/avoid-new',
    ]);
  });

  test('a type-aware rule is marked as running when typeAware is on', () => {
    expect(
      ruleRow(
        { options: { typeAware: true } },
        'typescript/no-floating-promises',
      ),
    ).toContain(
      '<span class="flag" title="Requires type information">type</span>',
    );
  });

  test('a type-aware rule is marked as not running when typeAware is not on', () => {
    expect(ruleRow({}, 'typescript/no-floating-promises')).toContain(
      '<span class="flag flag-idle" title="Does not run: it requires type information, and options.typeAware is not enabled">type</span>',
    );
  });

  test('typeAware turned on by an extended preset counts', () => {
    expect(
      ruleRow(
        { extends: [{ options: { typeAware: true } }] },
        'typescript/no-floating-promises',
      ),
    ).toContain(
      '<span class="flag" title="Requires type information">type</span>',
    );
  });

  test('a rule of a JS plugin is not linked to oxc.rs', () => {
    expect(
      ruleRow(
        { rules: { 'regexp/no-dupe-disjunctions': 'error' } },
        'regexp/no-dupe-disjunctions',
      ),
    ).toContain(
      '<td><span class="mono">regexp/no-dupe-disjunctions</span></td>',
    );
  });
});
