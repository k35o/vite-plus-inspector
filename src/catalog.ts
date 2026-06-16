import { execFile } from 'node:child_process';

function runCapture(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { cwd, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout) => {
        if (error)
          reject(error instanceof Error ? error : new Error('vp lint failed'));
        else resolve(stdout);
      },
    );
  });
}

/** Metadata for one registered oxlint rule, from `vp lint --rules --format=json`. */
export type RuleMeta = {
  /** Config-namespaced id, e.g. `no-console`, `typescript/no-explicit-any`. */
  id: string;
  /** Plugin namespace as used in config ids (`eslint`, `jsx-a11y`, …). */
  plugin: string;
  category: string;
  typeAware: boolean;
  /** Whether oxlint can autofix it (excludes `none` and `pending`). */
  fixable: boolean;
  /** Raw fix capability string from oxlint. */
  fix: string;
  /** On by default in oxlint's built-in config. */
  defaultOn: boolean;
  docsUrl: string;
};

type RawRule = {
  scope: string;
  value: string;
  category: string;
  type_aware: boolean;
  fix: string;
  default: boolean;
  docs_url: string;
};

/** Map an oxlint catalog scope to the namespace used in config rule ids. */
function scopeToPlugin(scope: string): string {
  if (scope === 'jsx_a11y') return 'jsx-a11y';
  if (scope === 'react_perf') return 'react-perf';
  return scope;
}

function toRuleMeta(raw: RawRule): RuleMeta {
  const plugin = scopeToPlugin(raw.scope);
  const id = raw.scope === 'eslint' ? raw.value : `${plugin}/${raw.value}`;
  return {
    id,
    plugin,
    category: raw.category,
    typeAware: raw.type_aware,
    fixable: raw.fix !== 'none' && raw.fix !== 'pending',
    fix: raw.fix,
    defaultOn: raw.default,
    docsUrl: raw.docs_url,
  };
}

/**
 * Load the full oxlint rule catalog by invoking `vp lint --rules --format=json`
 * in the target project. Returns null if vp is unavailable or the output can't
 * be parsed — the inspector degrades to showing only declared rules.
 */
export async function loadCatalog(root: string): Promise<RuleMeta[] | null> {
  try {
    const stdout = await runCapture(
      'vp',
      ['lint', '--rules', '--format=json'],
      root,
    );
    const start = stdout.indexOf('[');
    if (start === -1) return null;
    const raw = JSON.parse(stdout.slice(start)) as RawRule[];
    if (!Array.isArray(raw)) return null;
    return raw.map((rule) => toRuleMeta(rule));
  } catch {
    return null;
  }
}
