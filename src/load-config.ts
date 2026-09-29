import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { createJiti } from 'jiti';

import type { VitePlusConfig } from './types.ts';

// Live reload can start a load while another is still in flight, so the
// marker below stays set until the last of them has finished.
let loading = 0;
let outerMarker: string | undefined;

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

  // vite-plus skips `lazyPlugins()` factories only while this is set, which is
  // how `vp` itself reads the config blocks without running plugin setup.
  if (loading === 0) outerMarker = process.env['VP_RESOLVING_CONFIG_METADATA'];
  loading += 1;
  process.env['VP_RESOLVING_CONFIG_METADATA'] = '1';
  try {
    // jiti's module cache would keep returning the file's first evaluation.
    const jiti = createJiti(import.meta.url, { moduleCache: false });
    const mod = await jiti.import<{ default?: unknown } | VitePlusConfig>(
      configPath,
    );
    const exported = (mod as { default?: unknown }).default ?? mod;

    const resolved =
      typeof exported === 'function'
        ? (exported as (env: unknown) => unknown)({
            command: 'serve',
            mode: 'development',
          })
        : exported;

    return (await resolved) as VitePlusConfig;
  } finally {
    loading -= 1;
    if (loading === 0) {
      if (outerMarker === undefined) {
        delete process.env['VP_RESOLVING_CONFIG_METADATA'];
      } else {
        process.env['VP_RESOLVING_CONFIG_METADATA'] = outerMarker;
      }
    }
  }
}
