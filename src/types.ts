/**
 * Minimal structural types for the slices of a vite-plus `vite.config.ts`
 * the inspector reads. These are intentionally loose — the config is loaded
 * at runtime via jiti, so we model only what we render and treat everything
 * else as opaque.
 */

export type RuleValue = unknown;

/**
 * An oxlint config node. Presets (`@k8o/oxc-config` exports) and the user's
 * own `lint` block share this shape, and `extends` nests recursively
 * (`typescript` extends `base`, `react` extends `typescript`, …).
 */
export type LintNode = {
  extends?: LintNode[];
  plugins?: string[];
  jsPlugins?: string[];
  categories?: Record<string, RuleValue>;
  rules?: Record<string, RuleValue>;
  settings?: Record<string, unknown>;
  options?: Record<string, unknown>;
  env?: Record<string, boolean>;
  globals?: Record<string, unknown>;
  ignorePatterns?: string[];
  overrides?: LintOverride[];
  /** Presets carry no `name`; kept for forward-compat / user-named configs. */
  name?: string;
};

export type LintOverride = {
  files: string | string[];
  plugins?: string[];
  rules?: Record<string, RuleValue>;
  env?: Record<string, boolean>;
};

export type FmtOverride = {
  files: string | string[];
  options?: Record<string, unknown>;
};

export type FmtConfig = {
  ignorePatterns?: string[];
  overrides?: FmtOverride[];
  [key: string]: unknown;
};

export type PackConfig = {
  entry?: string | string[] | Record<string, string>;
  format?: string | string[];
  [key: string]: unknown;
};

export type RunTask = {
  command?: string;
  cwd?: string;
  dependsOn?: string[];
  cache?: boolean;
  input?: unknown;
  output?: unknown;
  env?: Record<string, unknown>;
  untrackedEnv?: unknown;
};

export type RunConfig = {
  cache?: boolean | { scripts?: boolean; tasks?: boolean };
  enablePrePostScripts?: boolean;
  tasks?: Record<string, RunTask>;
};

export type VitePlusConfig = {
  fmt?: FmtConfig;
  lint?: LintNode;
  staged?: Record<string, string>;
  pack?: PackConfig | PackConfig[];
  test?: Record<string, unknown>;
  run?: RunConfig;
  create?: Record<string, unknown>;
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
