import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadConfig } from '../src/load-config.ts';

type Gates = { lazyPluginGates?: Array<Promise<void>> };

const lazy = join(import.meta.dirname, 'fixtures/lazy-plugins');
const gated = join(import.meta.dirname, 'fixtures/gated-lazy-plugins');

/** Two loads in flight at once, where the one started first also ends first. */
async function overlappingLoads(): Promise<void> {
  const open: Array<() => void> = [];
  const gates = [0, 1].map(
    () =>
      new Promise<void>((resolve) => {
        open.push(resolve);
      }),
  );
  (globalThis as Gates).lazyPluginGates = gates;

  const first = loadConfig(gated);
  await vi.waitFor(() => {
    expect(gates).toHaveLength(1);
  });
  const second = loadConfig(gated);
  open[0]?.();
  await first;
  open[1]?.();
  await second;
}

describe('loadConfig', () => {
  beforeEach(() => {
    delete process.env['VP_RESOLVING_CONFIG_METADATA'];
  });

  afterEach(() => {
    delete process.env['LAZY_PLUGIN_FACTORY_RAN'];
    delete process.env['VP_RESOLVING_CONFIG_METADATA'];
    delete (globalThis as Gates).lazyPluginGates;
  });

  test('reads the config blocks', async () => {
    const config = await loadConfig(lazy);
    expect(config.staged).toStrictEqual({ '*.ts': 'vp check --fix' });
  });

  test('calls a config exported as a function', async () => {
    const config = await loadConfig(gated);
    expect(config.staged).toStrictEqual({ '*.ts': 'vp check --fix' });
  });

  test('re-reads a config that changed on disk', async () => {
    const project = mkdtempSync(join(tmpdir(), 'vpi-'));
    try {
      const file = join(project, 'vite.config.ts');
      writeFileSync(file, "export default { staged: { '*.ts': 'first' } };\n");
      await loadConfig(project);
      writeFileSync(file, "export default { staged: { '*.ts': 'second' } };\n");
      expect((await loadConfig(project)).staged).toStrictEqual({
        '*.ts': 'second',
      });
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test('does not run the project’s lazy plugin factories', async () => {
    await loadConfig(lazy);
    expect(process.env['LAZY_PLUGIN_FACTORY_RAN']).toBeUndefined();
  });

  test('does not run them in a load that outlasts an overlapping one', async () => {
    await overlappingLoads();
    expect(process.env['LAZY_PLUGIN_FACTORY_RAN']).toBeUndefined();
  });

  test('leaves the environment unset when it was unset', async () => {
    await loadConfig(lazy);
    expect(process.env['VP_RESOLVING_CONFIG_METADATA']).toBeUndefined();
  });

  test('leaves the environment unset after overlapping loads', async () => {
    await overlappingLoads();
    expect(process.env['VP_RESOLVING_CONFIG_METADATA']).toBeUndefined();
  });

  test('restores a marker that was already set', async () => {
    process.env['VP_RESOLVING_CONFIG_METADATA'] = 'outer';
    await loadConfig(lazy);
    expect(process.env['VP_RESOLVING_CONFIG_METADATA']).toBe('outer');
  });

  test('fails when the directory has no vite.config.ts', async () => {
    await expect(loadConfig(import.meta.dirname)).rejects.toThrow(
      'vite.config.ts not found',
    );
  });
});
