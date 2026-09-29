import type { RuleMeta } from './catalog.ts';
import type { FileOverride } from './resolve-file.ts';
import {
  countPresetRules,
  inferPresetLabel,
  resolveCategories,
  resolveEffective,
  resolveOptions,
  resolveOverrides,
  resolvePlugins,
} from './resolve.ts';
import type {
  CheckConfig,
  CreateConfig,
  DefaultPackage,
  DefaultPackageCommand,
  EnrichedRule,
  FmtConfig,
  LintNode,
  PackConfig,
  RunConfig,
  RunTask,
  Severity,
  StagedConfig,
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
  excludeFiles: string[];
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
  /** What `resolveForFile` layers onto `rules` for a file path. */
  resolve: { overrides: FileOverride[] };
  /** Distinct plugins and categories present in `rules`, for filter menus. */
  facets: { plugins: string[]; categories: string[] };
  /** Whether the full oxlint rule catalog was available. */
  hasCatalog: boolean;
  totalRules: number;
  configuredCount: number;
};

export type PackEntry = {
  /** Output name, or null for an entry given as a bare path. */
  name: string | null;
  files: string[];
};

export type PackView = {
  entries: PackEntry[];
  options: Record<string, unknown>;
};

export type TaskView = Omit<RunTask, 'command'> & { commands: string[] };

export type RunView = Omit<RunConfig, 'tasks'> & {
  tasks: Record<string, TaskView>;
};

export type SectionId =
  | 'overview'
  | 'fmt'
  | 'lint'
  | 'check'
  | 'staged'
  | 'pack'
  | 'defaultPackage'
  | 'test'
  | 'run'
  | 'create';

export type InspectorData = {
  configPath: string;
  present: Record<Exclude<SectionId, 'overview'>, boolean>;
  fmt: FmtConfig | null;
  lint: LintView | null;
  check: CheckConfig | null;
  staged: StagedConfig | null;
  pack: PackView[] | null;
  defaultPackage: Partial<Record<DefaultPackageCommand, string>> | null;
  test: Record<string, unknown> | null;
  run: RunView | null;
  create: CreateConfig | null;
};

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function toList<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

function severityCounts(rules: EnrichedRule[]): LintView['counts'] {
  const counts = { error: 0, warn: 0, off: 0 };
  for (const rule of rules) counts[rule.severity] += 1;
  return counts;
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

  const rules = resolveEffective(lint, catalog ?? []);
  const resolve = { overrides: resolveOverrides(lint, catalog ?? []) };
  const overrides: OverrideSummary[] = resolve.overrides.map((o) => ({
    files: o.files,
    excludeFiles: o.excludeFiles,
    ruleCount: o.rules.length,
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
    options: resolveOptions(lint),
    settings: lint.settings ?? {},
    ignorePatterns: lint.ignorePatterns ?? [],
    plugins: resolvePlugins(lint),
    categories: resolveCategories(lint),
    presets,
    rules,
    overrides,
    counts: severityCounts(rules),
    resolve,
    facets: { plugins, categories },
    hasCatalog: Boolean(catalog && catalog.length > 0),
    totalRules: rules.length,
    configuredCount: rules.filter((r) => r.configured).length,
  };
}

function buildPackEntries(entry: PackConfig['entry']): PackEntry[] {
  if (entry === undefined) return [];
  return toList(entry).flatMap((item): PackEntry[] =>
    typeof item === 'string'
      ? [{ name: null, files: [item] }]
      : Object.entries(item).map(([name, files]) => ({
          name,
          files: toList(files),
        })),
  );
}

function buildPackViews(pack: VitePlusConfig['pack']): PackView[] | null {
  if (!pack) return null;
  return toList(pack).map(({ entry, ...options }) => ({
    entries: buildPackEntries(entry),
    options,
  }));
}

function buildTaskView(task: RunTask | string | string[]): TaskView {
  if (typeof task === 'string' || Array.isArray(task)) {
    return { commands: toList(task) };
  }
  const { command, ...rest } = task;
  return { ...rest, commands: toList(command) };
}

function buildRunView(run: VitePlusConfig['run']): RunView | null {
  if (!run) return null;
  const { tasks = {}, ...settings } = run;
  return {
    ...settings,
    tasks: Object.fromEntries(
      Object.entries(tasks).map(([name, task]) => [name, buildTaskView(task)]),
    ),
  };
}

function buildDefaultPackage(
  target: DefaultPackage | undefined,
): InspectorData['defaultPackage'] {
  if (target === undefined) return null;
  if (typeof target !== 'string') return target;
  return { dev: target, build: target, preview: target, pack: target };
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
      check: isPresent(config.check),
      staged: isPresent(config.staged),
      pack: isPresent(config.pack),
      defaultPackage: isPresent(config.defaultPackage),
      test: isPresent(config.test),
      run: isPresent(config.run),
      create: isPresent(config.create),
    },
    fmt: config.fmt ?? null,
    lint: config.lint ? buildLintView(config.lint, catalog) : null,
    check: config.check ?? null,
    staged: config.staged ?? null,
    pack: buildPackViews(config.pack),
    defaultPackage: buildDefaultPackage(config.defaultPackage),
    test: config.test ?? null,
    run: buildRunView(config.run),
    create: config.create ?? null,
  };
}

/**
 * JSON for the browser. A config holds values JSON cannot carry (task
 * functions, plugin hooks, regular expressions, `Infinity`), which would
 * otherwise vanish or turn into `null` / `{}`.
 */
export function serializeInspectorData(data: InspectorData): string {
  return JSON.stringify(data, (_key, value: unknown) => {
    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }
    if (value instanceof RegExp) return String(value);
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return String(value);
    }
    return value;
  });
}
