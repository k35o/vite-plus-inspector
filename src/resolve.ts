import type { RuleMeta } from './catalog.ts';
import { compareRules } from './resolve-file.ts';
import type { FileOverride } from './resolve-file.ts';
import { normalizePluginName, normalizeRuleId, pluginOf } from './rule-id.ts';
import type { EnrichedRule, LintNode, RuleValue, Severity } from './types.ts';

/** The plugins built into oxlint. `eslint` is on in every config. */
const BUILTIN_PLUGINS = new Set([
  'eslint',
  'import',
  'jest',
  'jsdoc',
  'jsx-a11y',
  'nextjs',
  'node',
  'oxc',
  'promise',
  'react',
  'react-perf',
  'typescript',
  'unicorn',
  'vitest',
  'vue',
]);

/** What a config that names no plugins enables. */
const DEFAULT_PLUGINS = ['unicorn', 'typescript', 'oxc'];

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
 * Unprefixed ids (`no-console`) belong to the `eslint` plugin; the docs path
 * spells plugin names with underscores (`jsx_a11y`, `react_perf`). oxc.rs
 * documents the built-in plugins only, so a JS plugin's rule gets no link.
 */
export function ruleDocsUrl(ruleId: string): string | null {
  const plugin = pluginOf(ruleId);
  if (!BUILTIN_PLUGINS.has(plugin)) return null;
  const rule = plugin === 'eslint' ? ruleId : ruleId.slice(plugin.length + 1);
  const scope = plugin.replaceAll('-', '_');
  return `https://oxc.rs/docs/guide/usage/linter/rules/${scope}/${rule}.html`;
}

/**
 * Best-effort label for an anonymous preset, inferred from its plugin set.
 * `@k8o/oxc-config` presets carry no `name`, but each layer lists every
 * plugin it depends on, so the most-derived plugin identifies the layer.
 */
export function inferPresetLabel(node: LintNode): string {
  const plugins = node.plugins ?? [];
  if (plugins.includes('nextjs')) return 'nextjs';
  if (plugins.includes('node')) return 'backend';
  if (plugins.includes('react')) return 'react';
  if (plugins.includes('vitest') || plugins.includes('jest')) return 'test';
  if (plugins.includes('typescript')) return 'typescript';
  if (jsPluginSpecifiers(node).includes('oxlint-tailwindcss'))
    return 'tailwind';
  if (plugins.length > 0) return 'base';
  // A plugin-less preset (e.g. a JS-plugin layer) is best identified by the
  // namespace its rules share.
  const ns = dominantNamespace(node.rules);
  return ns ?? 'preset';
}

function jsPluginSpecifiers(node: LintNode): string[] {
  return (node.jsPlugins ?? []).map((plugin) =>
    typeof plugin === 'string' ? plugin : plugin.specifier,
  );
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

type Winner = { value: RuleValue; source: string };

/** The explicit rule entries of the whole extends chain; the last one wins. */
function explicitRules(
  lint: LintNode,
  catalog: Map<string, RuleMeta>,
): Map<string, Winner> {
  const winners = new Map<string, Winner>();
  for (const node of flattenExtends(lint)) {
    const source = node === lint ? 'config' : inferPresetLabel(node);
    for (const [id, value] of Object.entries(node.rules ?? {})) {
      winners.set(normalizeRuleId(id, catalog), { value, source });
    }
  }
  return winners;
}

/** Effective categories merged across the extends chain + own categories. */
export function resolveCategories(lint: LintNode): Record<string, Severity> {
  const merged: Record<string, Severity> = {};
  for (const node of flattenExtends(lint)) {
    for (const [cat, val] of Object.entries(node.categories ?? {})) {
      merged[cat] = normalizeSeverity(val);
    }
  }
  return merged;
}

/**
 * Enabled plugins: what every config of the extends chain enables, together.
 * A config that names no plugins enables the default ones.
 */
export function resolvePlugins(lint: LintNode): string[] {
  const plugins = new Set(['eslint']);
  for (const node of flattenExtends(lint)) {
    for (const plugin of node.plugins ?? DEFAULT_PLUGINS) {
      plugins.add(normalizePluginName(plugin));
    }
  }
  return [...plugins];
}

/** Options merged key by key across the extends chain; the last one wins. */
export function resolveOptions(lint: LintNode): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const node of flattenExtends(lint)) {
    for (const [key, value] of Object.entries(node.options ?? {})) {
      if (value !== undefined) merged[key] = value;
    }
  }
  return merged;
}

/** Count the rules contributed by a preset across its whole extends chain. */
export function countPresetRules(node: LintNode): number {
  const ids = new Set<string>();
  for (const n of flattenExtends(node)) {
    for (const id of Object.keys(n.rules ?? {})) ids.add(id);
  }
  return ids.size;
}

function describeRule(id: string, meta: RuleMeta | undefined) {
  return {
    id,
    docsUrl: meta ? meta.docsUrl : ruleDocsUrl(id),
    plugin: meta?.plugin ?? pluginOf(id),
    category: meta?.category ?? null,
    typeAware: meta?.typeAware ?? false,
    fixable: meta?.fixable ?? false,
    defaultOn: meta?.defaultOn ?? false,
  };
}

type RuleDescription = ReturnType<typeof describeRule>;

function configuredRule(rule: RuleDescription, winner: Winner): EnrichedRule {
  return {
    ...rule,
    severity: normalizeSeverity(winner.value),
    options: ruleOptions(winner.value),
    source: winner.source,
    configured: true,
  };
}

/** A rule runs only when its plugin is enabled. JS plugins are not gated. */
function runs(plugin: string, enabled: Set<string>): boolean {
  return !BUILTIN_PLUGINS.has(plugin) || enabled.has(plugin);
}

/** What a rule's category gives it, when the category gives it anything. */
function categoryBaseline(
  category: string | null,
  categories: Record<string, Severity>,
): EnrichedRule['pluginBaseline'] {
  if (category === null) return undefined;
  const severity = categories[category];
  if (severity !== undefined) {
    return { severity, source: `category: ${category}` };
  }
  // oxlint warns on correctness rules unless the config says otherwise.
  return category === 'correctness'
    ? { severity: 'warn', source: 'default' }
    : undefined;
}

function resolveRule(
  rule: RuleDescription,
  winner: Winner | undefined,
  categories: Record<string, Severity>,
  enabled: Set<string>,
): EnrichedRule {
  const baseline = categoryBaseline(rule.category, categories);
  if (!runs(rule.plugin, enabled)) {
    return {
      ...rule,
      severity: 'off',
      options: [],
      source: 'plugin disabled',
      configured: false,
      ...(baseline &&
        baseline.severity !== 'off' && { pluginBaseline: baseline }),
    };
  }
  if (winner) return configuredRule(rule, winner);
  return {
    ...rule,
    severity: 'off',
    source: 'off',
    ...baseline,
    options: [],
    configured: false,
  };
}

/**
 * Resolve the effective state of EVERY rule in the catalog (plus any configured
 * rules not in the catalog, e.g. JS-plugin rules). A rule of a plugin that is
 * not enabled is off. Otherwise its severity comes from, in order of
 * precedence: an explicit rule entry, its category baseline, or off. Per-file
 * overrides are layered on by `resolveForFile`.
 */
export function resolveEffective(
  lint: LintNode,
  catalog: RuleMeta[],
): EnrichedRule[] {
  const byId = new Map(catalog.map((meta) => [meta.id, meta]));
  const winners = explicitRules(lint, byId);
  const categories = resolveCategories(lint);
  const enabled = new Set(resolvePlugins(lint));

  return [...new Set([...byId.keys(), ...winners.keys()])]
    .map((id) =>
      resolveRule(
        describeRule(id, byId.get(id)),
        winners.get(id),
        categories,
        enabled,
      ),
    )
    .toSorted(compareRules);
}

export type ResolvedOverride = FileOverride & {
  /** Label of the preset that declares it, or null for the config's own. */
  preset: string | null;
};

/**
 * Every override that applies to the config, those of the extended presets
 * first, each with the rules it sets. An override sets the rules of the
 * plugins the config enables and of the plugins it names itself.
 */
export function resolveOverrides(
  lint: LintNode,
  catalog: RuleMeta[],
): ResolvedOverride[] {
  const byId = new Map(catalog.map((meta) => [meta.id, meta]));
  const base = resolvePlugins(lint);

  return flattenExtends(lint)
    .flatMap((node) =>
      (node.overrides ?? []).map((override) => ({
        override,
        preset: node === lint ? null : inferPresetLabel(node),
      })),
    )
    .map(({ override, preset }) => {
      const plugins = override.plugins
        ? [
            ...new Set([
              'eslint',
              ...override.plugins.map((name) => normalizePluginName(name)),
            ]),
          ]
        : null;
      const enabled = new Set([...base, ...(plugins ?? [])]);
      const source = `override: ${override.files.join(', ')}`;

      const winners = new Map<string, Winner>();
      for (const [id, value] of Object.entries(override.rules ?? {})) {
        winners.set(normalizeRuleId(id, byId), { value, source });
      }
      const rules = [...winners]
        .map(([id, winner]) =>
          configuredRule(describeRule(id, byId.get(id)), winner),
        )
        .filter((rule) => runs(rule.plugin, enabled));

      return {
        files: override.files,
        excludeFiles: override.excludeFiles ?? [],
        plugins,
        preset,
        rules,
      };
    });
}
