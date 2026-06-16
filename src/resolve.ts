import type {
  LintNode,
  LintOverride,
  ResolvedRule,
  RuleValue,
  Severity,
} from './types.ts';

/**
 * Normalize any oxlint severity expression to one of three buckets.
 *
 * oxlint accepts `error`/`deny`/`2`, `warn`/`1`, and `off`/`allow`/`0`,
 * either bare or as the first element of a `[severity, ...options]` tuple.
 */
export function normalizeSeverity(value: RuleValue): Severity {
  const head = Array.isArray(value) ? (value[0] as RuleValue) : value;
  if (head === 'error' || head === 'deny' || head === 2) return 'error';
  if (head === 'warn' || head === 1) return 'warn';
  return 'off';
}

/** Extract the tuple options that follow the severity, if any. */
export function ruleOptions(value: RuleValue): unknown[] {
  return Array.isArray(value) ? value.slice(1) : [];
}

/**
 * Map a rule id to its oxc.rs documentation URL.
 *
 * Unprefixed ids (`no-console`) belong to the `eslint` plugin; `jsx-a11y` is
 * spelled `jsx_a11y` in the docs path. JS plugins like `tailwindcss` are not
 * hosted on oxc.rs, so they get no link.
 */
export function ruleDocsUrl(ruleId: string): string | null {
  const slash = ruleId.indexOf('/');
  const plugin = slash === -1 ? 'eslint' : ruleId.slice(0, slash);
  const rule = slash === -1 ? ruleId : ruleId.slice(slash + 1);
  if (plugin === 'tailwindcss') return null;
  const seg = plugin === 'jsx-a11y' ? 'jsx_a11y' : plugin;
  return `https://oxc.rs/docs/guide/usage/linter/rules/${seg}/${rule}`;
}

/**
 * Best-effort label for an anonymous preset, inferred from its plugin set.
 * `@k8o/oxc-config` presets carry no `name`, but each layer lists every
 * plugin it depends on, so the most-derived plugin identifies the layer.
 */
export function inferPresetLabel(node: LintNode): string {
  if (typeof node.name === 'string' && node.name.length > 0) return node.name;
  const plugins = node.plugins ?? [];
  if (plugins.includes('nextjs')) return 'nextjs';
  if (plugins.includes('node')) return 'backend';
  if (plugins.includes('react')) return 'react';
  if (plugins.includes('vitest') || plugins.includes('jest')) return 'test';
  if (plugins.includes('typescript')) return 'typescript';
  if ((node.jsPlugins ?? []).includes('oxlint-tailwindcss')) return 'tailwind';
  if (plugins.length > 0) return 'base';
  // A plugin-less preset (e.g. a JS-plugin layer) is best identified by the
  // namespace its rules share.
  const ns = dominantNamespace(node.rules);
  return ns ?? 'preset';
}

/** The rule-id namespace shared by the most rules, or null if none dominates. */
function dominantNamespace(rules: LintNode['rules']): string | null {
  if (!rules) return null;
  const counts = new Map<string, number>();
  for (const id of Object.keys(rules)) {
    const slash = id.indexOf('/');
    if (slash === -1) continue;
    const ns = id.slice(0, slash);
    counts.set(ns, (counts.get(ns) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [ns, count] of counts) {
    if (count > bestCount) {
      best = ns;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Flatten a node's `extends` chain depth-first, ancestors before descendants,
 * preserving array order. The node itself is appended last.
 */
export function flattenExtends(node: LintNode): LintNode[] {
  const out: LintNode[] = [];
  for (const parent of node.extends ?? []) {
    out.push(...flattenExtends(parent));
  }
  out.push(node);
  return out;
}

/**
 * Convert a glob (as used in oxlint `overrides[].files`) to an anchored RegExp.
 * Supports `**`, `*`, `?`, and `{a,b}` brace alternation.
 */
export function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 2;
        } else {
          re += '.*';
          i += 1;
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '{') {
      re += '(?:';
    } else if (c === '}') {
      re += ')';
    } else if (c === ',') {
      re += '|';
    } else if (c === '/') {
      re += '/';
    } else if (c !== undefined && '.+^$()|[]\\'.includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`, 'u');
}

/** Whether `filePath` matches any of an override's `files` globs. */
export function matchesFiles(
  files: string | string[],
  filePath: string,
): boolean {
  const globs = Array.isArray(files) ? files : [files];
  return globs.some((glob) => globToRegExp(glob).test(filePath));
}

type Winner = { value: RuleValue; source: string };

function applyRules(
  into: Map<string, Winner>,
  rules: Record<string, RuleValue> | undefined,
  source: string,
): void {
  if (!rules) return;
  for (const [id, value] of Object.entries(rules)) {
    into.set(id, { value, source });
  }
}

function toResolvedRules(map: Map<string, Winner>): ResolvedRule[] {
  const order: Record<Severity, number> = { error: 0, warn: 1, off: 2 };
  return [...map.entries()]
    .map(([id, w]) => ({
      id,
      severity: normalizeSeverity(w.value),
      options: ruleOptions(w.value),
      source: w.source,
      docsUrl: ruleDocsUrl(id),
    }))
    .toSorted(
      (a, b) =>
        order[a.severity] - order[b.severity] || a.id.localeCompare(b.id),
    );
}

/** The fully merged extends chain + own rules, as a winner map (no overrides). */
function baseWinners(lint: LintNode): Map<string, Winner> {
  const map = new Map<string, Winner>();
  for (const parent of lint.extends ?? []) {
    for (const node of flattenExtends(parent)) {
      applyRules(map, node.rules, inferPresetLabel(node));
    }
  }
  applyRules(map, lint.rules, 'config');
  return map;
}

/** Effective rules for the config as a whole, ignoring per-file overrides. */
export function resolveBaseRules(lint: LintNode): ResolvedRule[] {
  return toResolvedRules(baseWinners(lint));
}

/** Effective categories merged across the extends chain + own categories. */
export function resolveCategories(lint: LintNode): Record<string, Severity> {
  const merged: Record<string, Severity> = {};
  const nodes: LintNode[] = [];
  for (const parent of lint.extends ?? [])
    nodes.push(...flattenExtends(parent));
  nodes.push(lint);
  for (const node of nodes) {
    for (const [cat, val] of Object.entries(node.categories ?? {})) {
      merged[cat] = normalizeSeverity(val);
    }
  }
  return merged;
}

/** Effective plugin set: the last `plugins` array set along the chain wins. */
export function resolvePlugins(lint: LintNode): string[] {
  let plugins: string[] = [];
  const nodes: LintNode[] = [];
  for (const parent of lint.extends ?? [])
    nodes.push(...flattenExtends(parent));
  nodes.push(lint);
  for (const node of nodes) {
    if (node.plugins && node.plugins.length > 0) ({ plugins } = node);
  }
  return plugins;
}

export type FileResolution = {
  file: string;
  matchedOverrides: string[];
  rules: ResolvedRule[];
};

/**
 * Resolve the effective rules for a specific file path: the base config plus
 * every matching override applied in array order (later overrides win).
 */
export function resolveForFile(
  lint: LintNode,
  filePath: string,
): FileResolution {
  const map = baseWinners(lint);
  const matched: string[] = [];
  const overrides: LintOverride[] = lint.overrides ?? [];
  for (const override of overrides) {
    if (matchesFiles(override.files, filePath)) {
      const label = Array.isArray(override.files)
        ? override.files.join(', ')
        : override.files;
      matched.push(label);
      applyRules(map, override.rules, `override: ${label}`);
    }
  }
  return {
    file: filePath,
    matchedOverrides: matched,
    rules: toResolvedRules(map),
  };
}

/** Count the rules contributed by a preset across its whole extends chain. */
export function countPresetRules(node: LintNode): number {
  const ids = new Set<string>();
  for (const n of flattenExtends(node)) {
    for (const id of Object.keys(n.rules ?? {})) ids.add(id);
  }
  return ids.size;
}
