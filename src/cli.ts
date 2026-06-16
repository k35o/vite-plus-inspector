#!/usr/bin/env node
import { spawn } from 'node:child_process';

import { cac } from 'cac';

import { loadCatalog } from './catalog.ts';
import { configPathFor, loadConfig } from './load-config.ts';
import { startServer } from './server.ts';

const DEFAULT_PORT = 5177;

const cli = cac('vp-inspect');

cli
  .command(
    '[root]',
    'Directory containing vite.config.ts (default: current directory)',
  )
  .option('-p, --port <port>', 'Port for the inspector server', {
    default: process.env['PORT'] ?? DEFAULT_PORT,
  })
  .option('--no-open', 'Do not open the browser automatically')
  .option('--no-watch', 'Do not reload when vite.config.ts changes')
  .action(
    async (
      root: string | undefined,
      options: { port: string | number; open: boolean; watch: boolean },
    ) => {
      const target = root ?? '.';
      const configPath = configPathFor(target);

      process.stdout.write(`Loading ${configPath}\n`);

      try {
        await loadConfig(target);
      } catch (error) {
        process.stderr.write(`vp-inspect: ${(error as Error).message}\n`);
        process.exit(1);
      }

      const catalog = await loadCatalog(target);
      if (!catalog) {
        process.stdout.write(
          'vp-inspect: rule catalog unavailable (vp not found) — showing declared rules only\n',
        );
      }

      const { url } = await startServer({
        configPath,
        catalog,
        port: Number(options.port),
        watch: options.watch,
        loadConfig: () => loadConfig(target),
      });
      process.stdout.write(
        `\n  Vite+ Inspector  ${url}\n\n  Press Ctrl+C to stop.\n\n`,
      );

      if (options.open) openBrowser(url);
    },
  );

cli.help();
cli.version('0.0.0');
cli.parse();

function openBrowser(url: string): void {
  const args =
    process.platform === 'darwin'
      ? ['open', url]
      : process.platform === 'win32'
        ? ['cmd', '/c', 'start', '', url]
        : ['xdg-open', url];
  const [cmd, ...rest] = args;
  if (cmd === undefined) return;
  spawn(cmd, rest, { stdio: 'ignore', detached: true }).unref();
}
