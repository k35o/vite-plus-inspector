/**
 * Minimal structural types for the slices of a vite-plus `vite.config.ts`
 * the inspector reads. These are intentionally loose — the config is loaded
 * at runtime via jiti, so we model only what we render and treat everything
 * else as opaque.
 */

export type RuleValue = unknown;

export type JsPlugin = string | { name: string; specifier: string };

/**
 * An oxlint config node. Presets (`@k8o/oxc-config` exports) and the user's
 * own `lint` block share this shape, and `extends` nests recursively
 * (`typescript` extends `base`, `react` extends `typescript`, …).
 */
export type LintNode = {
  extends?: LintNode[];
  plugins?: string[];
  jsPlugins?: JsPlugin[];
  categories?: Record<string, RuleValue>;
  rules?: Record<string, RuleValue>;
  settings?: Record<string, unknown>;
  options?: Record<string, unknown>;
  env?: Record<string, boolean>;
  globals?: Record<string, unknown>;
  ignorePatterns?: string[];
  overrides?: LintOverride[];
};

export type LintOverride = {
  files: string[];
  excludeFiles?: string[];
  plugins?: string[];
  rules?: Record<string, RuleValue>;
  env?: Record<string, boolean>;
};

export type FmtOverride = {
  files: string[];
  excludeFiles?: string[];
  options?: Record<string, unknown>;
};

export type FmtConfig = {
  ignorePatterns?: string[];
  overrides?: FmtOverride[];
  [key: string]: unknown;
};

export type CheckConfig = {
  fmt?: boolean;
  lint?: boolean;
};

export type DefaultPackageCommand = 'dev' | 'build' | 'preview' | 'pack';

export type DefaultPackage =
  | string
  | Partial<Record<DefaultPackageCommand, string>>;

export type PackEntryMap = Record<string, string | string[]>;

export type PackConfig = {
  entry?: string | PackEntryMap | Array<string | PackEntryMap>;
  [key: string]: unknown;
};

export type TaskGlob =
  | string
  | { auto: boolean }
  | { pattern: string; base: 'workspace' | 'package' };

export type RunTaskCache = {
  env?: string[];
  untrackedEnv?: string[];
  input?: TaskGlob[];
  output?: TaskGlob[];
};

export type RunTaskDependency =
  | string
  | { task: string; from: string | string[] };

export type RunTask = {
  command: string | string[];
  cwd?: string;
  dependsOn?: RunTaskDependency[];
  cache?: boolean | RunTaskCache;
};

export type RunConfig = {
  cache?: boolean | { scripts?: boolean; tasks?: boolean };
  enablePrePostScripts?: boolean;
  tasks?: Record<string, RunTask | string | string[]>;
};

type StagedGenerateTask = (
  files: readonly string[],
) => string | string[] | Promise<string | string[]>;

type StagedTaskFunction = {
  title: string;
  task: (files: readonly string[]) => void | Promise<void>;
};

type StagedCommand = string | StagedGenerateTask;

export type StagedConfig =
  | Record<
      string,
      | StagedCommand
      | StagedTaskFunction
      | Array<StagedCommand | StagedCommand[]>
    >
  | StagedGenerateTask;

export type CreateTemplate = {
  name: string;
  description: string;
  template: string;
};

export type CreateConfig = {
  defaultTemplate?: string;
  templates?: CreateTemplate[];
};

export type VitePlusConfig = {
  fmt?: FmtConfig;
  lint?: LintNode;
  check?: CheckConfig;
  staged?: StagedConfig;
  pack?: PackConfig | PackConfig[];
  defaultPackage?: DefaultPackage;
  test?: Record<string, unknown>;
  run?: RunConfig;
  create?: CreateConfig;
};

export type Severity = 'error' | 'warn' | 'off';

/** A single rule after merge resolution, with attribution. */
export type ResolvedRule = {
  id: string;
  severity: Severity;
  /** Tuple options that follow the severity in `[severity, ...options]`. */
  options: unknown[];
  /** Where the winning value came from: a preset label, `config`, or an override. */
  source: string;
  /** Link to oxc.rs rule docs, or null for plugins not documented there. */
  docsUrl: string | null;
};

/** A resolved rule enriched with catalog metadata (when a catalog is available). */
export type EnrichedRule = ResolvedRule & {
  plugin: string;
  category: string | null;
  typeAware: boolean;
  fixable: boolean;
  defaultOn: boolean;
  /** True when the severity comes from an explicit rule entry (not a category baseline or default). */
  configured: boolean;
};
