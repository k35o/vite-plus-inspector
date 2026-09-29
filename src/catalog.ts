import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

function runCapture(
  file: string,
  args: string[],
  cwd: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { cwd, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout);
          return;
        }
        // Node's own message is only the command line. The reason is in what
        // the child printed, and oxlint reports a rejected lint config on
        // stdout while stderr may hold nothing but an unrelated note.
        const output = `${stdout}${stderr}`.trim();
        reject(new Error(output || error.message));
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
    defaultOn: raw.default,
    docsUrl: raw.docs_url,
  };
}

/** Parse the stdout of `vp lint --rules --format=json`. */
export function parseCatalog(stdout: string): RuleMeta[] {
  // vp evaluates the project's config in the same process, so whatever the
  // config prints while it loads comes before the array.
  const start = Math.max(stdout.search(/^\[$/mu), 0);
  const rules = JSON.parse(stdout.slice(start)) as RawRule[];
  return rules.map((rule) => toRuleMeta(rule));
}

/**
 * Load the full oxlint rule catalog from the vite-plus that the project's
 * `vite.config.ts` itself resolves, so the rules always match the project's
 * toolchain.
 */
export async function loadCatalog(configPath: string): Promise<RuleMeta[]> {
  const projectRequire = createRequire(configPath);
  const manifestPath = projectRequire.resolve('vite-plus/package.json');
  const { bin } = projectRequire(manifestPath) as { bin: { vp: string } };
  const stdout = await runCapture(
    process.execPath,
    [join(dirname(manifestPath), bin.vp), 'lint', '--rules', '--format=json'],
    dirname(configPath),
  );
  return parseCatalog(stdout);
}
