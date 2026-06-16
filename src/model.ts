import {
  countPresetRules,
  inferPresetLabel,
  resolveBaseRules,
  resolveCategories,
  resolvePlugins,
} from './resolve.ts';
import type {
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
  baseRules: ResolvedRule[];
  overrides: OverrideSummary[];
  counts: { error: number; warn: number; off: number };
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

function severityCounts(rules: ResolvedRule[]): LintView['counts'] {
  const counts = { error: 0, warn: 0, off: 0 };
  for (const rule of rules) counts[rule.severity] += 1;
  return counts;
}

export function buildLintView(lint: LintNode): LintView {
  const presets: PresetSummary[] = (lint.extends ?? []).map((preset) => ({
    label: inferPresetLabel(preset),
    plugins: resolvePlugins(preset),
    categories: resolveCategories(preset),
    ruleCount: countPresetRules(preset),
  }));

  const baseRules = resolveBaseRules(lint);
  const overrides: OverrideSummary[] = (lint.overrides ?? []).map((o) => ({
    files: Array.isArray(o.files) ? o.files : [o.files],
    ruleCount: Object.keys(o.rules ?? {}).length,
  }));

  return {
    options: lint.options ?? {},
    settings: lint.settings ?? {},
    ignorePatterns: lint.ignorePatterns ?? [],
    plugins: resolvePlugins(lint),
    categories: resolveCategories(lint),
    presets,
    baseRules,
    overrides,
    counts: severityCounts(baseRules),
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
    lint: config.lint ? buildLintView(config.lint) : null,
    staged: config.staged ?? null,
    pack: normalizePack(config.pack),
    test: config.test ?? null,
    run: config.run ?? null,
    create: config.create ?? null,
  };
}
