import { runInNewContext } from 'node:vm';

import { buildHtml } from '../src/build-html.ts';
import { buildInspectorData } from '../src/model.ts';
import type { VitePlusConfig } from '../src/types.ts';

type El = {
  innerHTML: string;
  textContent: string;
  value: string;
  listeners: Record<string, () => void>;
  addEventListener: (type: string, fn: () => void) => void;
};

/** Runs the page's own scripts against a DOM that only stores what is written. */
function open(config: VitePlusConfig) {
  const html = buildHtml(buildInspectorData(config, '/p/vite.config.ts'));
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
});
