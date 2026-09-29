import type { RuleMeta } from './catalog.ts';

const PLUGIN_ALIASES: Record<string, string> = {
  'react-hooks': 'react',
  react_hooks: 'react',
  '@typescript-eslint': 'typescript',
  'typescript-eslint': 'typescript',
  typescript_eslint: 'typescript',
  deepscan: 'oxc',
  'import-x': 'import',
  jsx_a11y: 'jsx-a11y',
  'jsx-a11y-x': 'jsx-a11y',
  'jsx_a11y-x': 'jsx-a11y',
  react_perf: 'react-perf',
  '@next': 'nextjs',
  '@next/next': 'nextjs',
};

/** The name oxlint knows a plugin by, whichever way a config spells it. */
export function normalizePluginName(name: string): string {
  const bare = name
    .replace(/^(?<scope>@[^/]+)\/(?:eslint|oxlint)-plugin$/u, '$<scope>')
    .replace(/^(?<scope>(?:@[^/]+\/)?)(?:eslint|oxlint)-plugin-/u, '$<scope>');
  return PLUGIN_ALIASES[bare] ?? bare;
}

function splitRuleId(id: string): { plugin: string; name: string } {
  const slash = id.startsWith('@') ? id.lastIndexOf('/') : id.indexOf('/');
  return slash === -1
    ? { plugin: 'eslint', name: id }
    : { plugin: id.slice(0, slash), name: id.slice(slash + 1) };
}

/** The plugin a rule id belongs to. Unprefixed ids belong to `eslint`. */
export function pluginOf(id: string): string {
  return splitRuleId(id).plugin;
}

/**
 * The id the catalog lists a rule under, for an id written the way a config
 * may write it: through a plugin alias, or as a `typescript/` rule that oxlint
 * implements as the eslint rule of the same name.
 */
export function normalizeRuleId(
  id: string,
  catalog: Map<string, RuleMeta>,
): string {
  if (!id.includes('/')) {
    if (catalog.has(id)) return id;
    for (const meta of catalog.values()) {
      if (meta.id === `${meta.plugin}/${id}`) return meta.id;
    }
    return id;
  }
  const { plugin: written, name } = splitRuleId(id);
  const plugin = normalizePluginName(written);
  if (plugin === 'eslint') return name;
  const prefixed = `${plugin}/${name}`;
  if (plugin === 'typescript' && !catalog.has(prefixed) && catalog.has(name)) {
    return name;
  }
  return prefixed;
}
