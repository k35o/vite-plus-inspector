import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { createJiti } from 'jiti';

import type { VitePlusConfig } from './types.ts';

/** Resolve the absolute path to a project's `vite.config.ts`. */
export function configPathFor(root: string): string {
  return resolve(process.cwd(), root, 'vite.config.ts');
}

/**
 * Load and evaluate a vite-plus `vite.config.ts` via jiti, returning the
 * resolved config object. Handles `export default`, factory functions, and
 * promises. Preset `extends` arrive as fully-nested objects (jiti runs the
 * real module), which is what the resolver flattens.
 */
export async function loadConfig(root: string): Promise<VitePlusConfig> {
  const configPath = configPathFor(root);
  if (!existsSync(configPath)) {
    throw new Error(`vite.config.ts not found at ${configPath}`);
  }

  const jiti = createJiti(import.meta.url);
  const mod = (await jiti.import(configPath)) as
    | { default?: unknown }
    | VitePlusConfig;
  const exported = (mod as { default?: unknown }).default ?? mod;

  const resolved =
    typeof exported === 'function'
      ? (exported as (env: unknown) => unknown)({
          command: 'serve',
          mode: 'development',
        })
      : exported;

  return (await resolved) as VitePlusConfig;
}

/**
 * JSON-serialize a value for safe embedding in a `<script>` tag: functions and
 * regexps become readable placeholders and `</script>` is neutralized.
 */
export function safeSerialize(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, val: unknown) => {
      if (typeof val === 'function') {
        const { name } = val as { name?: string };
        const label =
          typeof name === 'string' && name.length > 0 ? name : 'anonymous';
        return `[Function: ${label}]`;
      }
      if (val instanceof RegExp) return val.toString();
      return val;
    },
    2,
  ).replaceAll(/<\/script>/giu, '<\\/script>');
}
