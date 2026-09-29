import type { EnrichedRule } from './types.ts';

// The page runs these functions from their source text, so each one has to
// work on its own: no imports, and no helpers outside its body.
/* oxlint-disable unicorn/consistent-function-scoping */

export type FileOverride = {
  files: string[];
  excludeFiles: string[];
  /** The plugins the override names, `eslint` included, or null when it names none. */
  plugins: string[] | null;
  rules: EnrichedRule[];
};

export type FileLintConfig = {
  /** The plugins the config enables, `eslint` included. */
  plugins: string[];
  rules: EnrichedRule[];
  resolve: { overrides: FileOverride[] };
};

export type FileResolution = {
  rules: EnrichedRule[];
  matchedOverrides: string[];
};

/** Display order: by severity, then configured rules first, then by id. */
export function compareRules(a: EnrichedRule, b: EnrichedRule): number {
  const order = { error: 0, warn: 1, off: 2 };
  return (
    order[a.severity] - order[b.severity] ||
    Number(b.configured) - Number(a.configured) ||
    a.id.localeCompare(b.id)
  );
}

/**
 * The rules oxlint applies to one file: the base rules with every matching
 * override layered on, in the order the overrides are declared. `file` is
 * relative to the config directory.
 */
export function resolveForFile(
  lint: FileLintConfig,
  file: string,
): FileResolution {
  function literal(text: string): string {
    return text.replaceAll(/[\\^$.*+?()[\]{}|/]/gu, String.raw`\$&`);
  }

  /** Index of the `]` that closes the class opened at `open`, or -1. */
  function classEnd(glob: string, open: number): number {
    let i = open + 1;
    if (glob[i] === '!' || glob[i] === '^') i += 1;
    // The first member is literal, so a `]` there does not close the class.
    for (let first = true; i < glob.length; first = false, i += 1) {
      if (glob[i] === ']' && !first) return i;
      if (glob[i] === '\\') i += 1;
    }
    return -1;
  }

  function classMembers(members: string): string {
    let source = '';
    for (let i = 0; i < members.length; i += 1) {
      const escaped = members[i] === '\\';
      if (escaped) i += 1;
      const c = members.charAt(i);
      source +=
        c === '-' && !escaped ? c : c.replace(/[\\\]^[-]/u, String.raw`\$&`);
    }
    return source;
  }

  function toRegExp(glob: string): RegExp {
    let source = '';
    let braces = 0;
    for (let i = 0; i < glob.length; i += 1) {
      const c = glob.charAt(i);
      const previous = glob[i - 1];
      const end = c === '[' ? classEnd(glob, i) : -1;
      if (c === '\\') {
        i += 1;
        source += literal(glob.charAt(i));
      } else if (c === '*' && glob[i + 1] === '*') {
        const opensSegment =
          previous === undefined ||
          previous === '/' ||
          (braces > 0 && (previous === '{' || previous === ','));
        const next = glob[i + 2];
        i += 1;
        if (opensSegment && next === '/') {
          source += '(?:.*/)?';
          i += 1;
        } else {
          // `**` crosses directories only as a whole path segment.
          source += opensSegment && next === undefined ? '.*' : '[^/]*';
        }
      } else if (c === '*') {
        source += '[^/]*';
      } else if (c === '?') {
        source += '[^/]';
      } else if (end !== -1) {
        const negated = glob[i + 1] === '!' || glob[i + 1] === '^';
        const members = classMembers(glob.slice(i + (negated ? 2 : 1), end));
        source += `(?!/)[${negated ? '^' : ''}${members}]`;
        i = end;
      } else if (c === '{') {
        braces += 1;
        source += '(?:';
      } else if (c === '}' && braces > 0) {
        braces -= 1;
        source += ')';
      } else if (c === ',' && braces > 0) {
        source += '|';
      } else {
        source += literal(c);
      }
    }
    try {
      return new RegExp(`^${source}${')'.repeat(braces)}$`, 'u');
    } catch {
      // A range that runs backwards, like `[z-a]`, is no error to oxlint: it
      // matches nothing.
      return /(?!)/u;
    }
  }

  function matches(pattern: string, path: string): boolean {
    const anchored = pattern.startsWith('./');
    const rest = anchored ? pattern.slice(2) : pattern;
    // Only a pattern that names no directory matches at any depth.
    const glob = anchored || rest.includes('/') ? rest : `**/${rest}`;
    const positive = glob.replace(/^!+/u, '');
    const negated = (glob.length - positive.length) % 2 === 1;
    return toRegExp(positive).test(path) !== negated;
  }

  function matchesAny(patterns: string[], path: string): boolean {
    return patterns.some((pattern) => matches(pattern, path));
  }

  const path = file.replace(/^\.\//u, '');
  const matched = lint.resolve.overrides.filter(
    (o) => matchesAny(o.files, path) && !matchesAny(o.excludeFiles, path),
  );
  if (matched.length === 0) return { rules: lint.rules, matchedOverrides: [] };

  const enabled = new Set(lint.plugins);
  for (const o of matched) {
    for (const plugin of o.plugins ?? []) enabled.add(plugin);
  }
  // Rules of the plugins that only the matching overrides enable.
  let pending = lint.rules.filter(
    (rule) => rule.pluginBaseline !== undefined && enabled.has(rule.plugin),
  );

  const rules = new Map(lint.rules.map((rule) => [rule.id, rule]));
  for (const o of matched) {
    // oxlint brings the category baseline of those plugins with the first
    // override that names plugins without naming every enabled one, and only
    // to the rules that are off by then.
    const named = o.plugins;
    if (named && ![...enabled].every((plugin) => named.includes(plugin))) {
      for (const { pluginBaseline, ...rule } of pending) {
        if (rules.get(rule.id)?.severity === 'off') {
          rules.set(rule.id, { ...rule, ...pluginBaseline });
        }
      }
      pending = [];
    }
    for (const rule of o.rules) rules.set(rule.id, rule);
  }

  return {
    rules: [...rules.values()],
    matchedOverrides: matched.map((o) => o.files.join(', ')),
  };
}
