import type { RuleMeta } from './catalog.ts';
import {
  countPresetRules,
  inferPresetLabel,
  resolveBaseRules,
  resolveCategories,
  resolveEffective,
  resolvePlugins,
} from './resolve.ts';
import type {
  EnrichedRule,
  LintNode,
  PackConfig,
  ResolvedRule,
  Severity,
  VitePlusConfig,
} from './types.ts';

export type PresetSummary = {
  label: string;
  plugins: string[];
  categories: Record<string, Severity>;
  ruleCount: number;
};

export type OverrideSummary = {
  files: string[];
  ruleCount: number;
};

export type LintView = {
  options: Record<string, unknown>;
  settings: Record<string, unknown>;
  ignorePatterns: string[];
  plugins: string[];
  categories: Record<string, Severity>;
  presets: PresetSummary[];
  rules: EnrichedRule[];
  overrides: OverrideSummary[];
  counts: { error: number; warn: number; off: number };
  /** Distinct plugins and categories present in `rules`, for filter menus. */
  facets: { plugins: string[]; categories: string[] };
  /** Whether the full oxlint rule catalog was available. */
  hasCatalog: boolean;
  totalRules: number;
  configuredCount: number;
};

export type SectionId =
  | 'overview'
  | 'fmt'
  | 'lint'
  | 'staged'
  | 'pack'
  | 'test'
  | 'run'
  | 'create';

export type InspectorData = {
  configPath: string;
  present: Record<Exclude<SectionId, 'overview'>, boolean>;
  fmt: VitePlusConfig['fmt'] | null;
  lint: LintView | null;
  staged: Record<string, string> | null;
  pack: PackConfig[] | null;
  test: Record<string, unknown> | null;
  run: VitePlusConfig['run'] | null;
  create: Record<string, unknown> | null;
};

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function severityCounts(rules: EnrichedRule[]): LintView['counts'] {
  const counts = { error: 0, warn: 0, off: 0 };
  for (const rule of rules) counts[rule.severity] += 1;
  return counts;
}

function pluginOf(id: string): string {
  return id.includes('/') ? id.slice(0, id.indexOf('/')) : 'eslint';
}

/** Promote a bare resolved rule to the enriched shape when no catalog exists. */
function withoutCatalog(rule: ResolvedRule): EnrichedRule {
  return {
    ...rule,
    plugin: pluginOf(rule.id),
    category: null,
    typeAware: false,
    fixable: false,
    defaultOn: false,
    configured: true,
  };
}

export function buildLintView(
  lint: LintNode,
  catalog?: RuleMeta[] | null,
): LintView {
  const presets: PresetSummary[] = (lint.extends ?? []).map((preset) => ({
    label: inferPresetLabel(preset),
    plugins: resolvePlugins(preset),
    categories: resolveCategories(preset),
    ruleCount: countPresetRules(preset),
  }));

  const rules: EnrichedRule[] =
    catalog && catalog.length > 0
      ? resolveEffective(lint, catalog)
      : resolveBaseRules(lint).map((rule) => withoutCatalog(rule));

  const overrides: OverrideSummary[] = (lint.overrides ?? []).map((o) => ({
    files: Array.isArray(o.files) ? o.files : [o.files],
    ruleCount: Object.keys(o.rules ?? {}).length,
  }));

  const plugins = [...new Set(rules.map((r) => r.plugin))].toSorted((a, b) =>
    a.localeCompare(b),
  );
  const categories = [
    ...new Set(
      rules.map((r) => r.category).filter((c): c is string => c !== null),
    ),
  ].toSorted((a, b) => a.localeCompare(b));

  return {
    options: lint.options ?? {},
    settings: lint.settings ?? {},
    ignorePatterns: lint.ignorePatterns ?? [],
    plugins: resolvePlugins(lint),
    categories: resolveCategories(lint),
    presets,
    rules,
    overrides,
    counts: severityCounts(rules),
    facets: { plugins, categories },
    hasCatalog: Boolean(catalog && catalog.length > 0),
    totalRules: rules.length,
    configuredCount: rules.filter((r) => r.configured).length,
  };
}

/** Normalize `pack` (object | array) to an array for uniform rendering. */
export function normalizePack(
  pack: VitePlusConfig['pack'],
): PackConfig[] | null {
  if (!pack) return null;
  return Array.isArray(pack) ? pack : [pack];
}

export function buildInspectorData(
  config: VitePlusConfig,
  configPath: string,
  catalog?: RuleMeta[] | null,
): InspectorData {
  return {
    configPath,
    present: {
      fmt: isPresent(config.fmt),
      lint: isPresent(config.lint),
      staged: isPresent(config.staged),
      pack: isPresent(config.pack),
      test: isPresent(config.test),
      run: isPresent(config.run),
      create: isPresent(config.create),
    },
    fmt: config.fmt ?? null,
    lint: config.lint ? buildLintView(config.lint, catalog) : null,
    staged: config.staged ?? null,
    pack: normalizePack(config.pack),
    test: config.test ?? null,
    run: config.run ?? null,
    create: config.create ?? null,
  };
}
