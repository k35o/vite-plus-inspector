import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import manifest from '../package.json' with { type: 'json' };

const cli = join(import.meta.dirname, '../src/cli.ts');

describe('vp-inspect --version', () => {
  test('prints the version of the package', () => {
    const stdout = execFileSync(process.execPath, [cli, '--version'], {
      encoding: 'utf8',
    });

    expect(stdout).toContain(`vp-inspect/${manifest.version} `);
  });
});
