import { watch, type FSWatcher } from 'node:fs';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { basename, dirname } from 'node:path';

import { buildHtml } from './build-html.ts';
import type { RuleMeta } from './catalog.ts';
import { buildInspectorData } from './model.ts';
import type { VitePlusConfig } from './types.ts';

export type InspectorServer = {
  url: string;
  port: number;
  close: () => Promise<void>;
};

export type StartOptions = {
  configPath: string;
  catalog: RuleMeta[] | null;
  port: number;
  watch: boolean;
  loadConfig: () => Promise<VitePlusConfig>;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/**
 * Start the inspector HTTP server. Serves the rendered page at `/`, the
 * view-model at `/__config.json`, and a live-reload stream at `/__events`.
 * Per-file rule resolution happens client-side from embedded data, so the
 * rendered page also works as a standalone static file. When `watch` is on,
 * edits to `vite.config.ts` rebuild the view-model and reload open tabs.
 */
export async function startServer(
  opts: StartOptions,
): Promise<InspectorServer> {
  let config = await opts.loadConfig();
  let data = buildInspectorData(config, opts.configPath, opts.catalog);
  let html = buildHtml(data);
  const clients = new Set<ServerResponse>();

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (url.pathname === '/__config.json') {
      res.writeHead(200, JSON_HEADERS);
      res.end(JSON.stringify(data));
      return;
    }

    if (url.pathname === '/__events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      });
      res.write('retry: 1000\n\n');
      clients.add(res);
      req.on('close', () => {
        clients.delete(res);
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(html);
  });

  const watcher = opts.watch
    ? watchConfig(opts, () => {
        void rebuild();
      })
    : undefined;

  async function rebuild(): Promise<void> {
    try {
      config = await opts.loadConfig();
      data = buildInspectorData(config, opts.configPath, opts.catalog);
      html = buildHtml(data);
      for (const client of clients) client.write('data: reload\n\n');
    } catch (error) {
      process.stderr.write(
        `vp-inspect: reload failed — ${(error as Error).message}\n`,
      );
    }
  }

  const port = await listen(server, opts.port);
  return {
    url: `http://localhost:${port}`,
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        watcher?.close();
        for (const client of clients) client.end();
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}

/** Watch the config's directory for changes to `vite.config.ts` (debounced). */
function watchConfig(opts: StartOptions, onChange: () => void): FSWatcher {
  const dir = dirname(opts.configPath);
  const name = basename(opts.configPath);
  let timer: NodeJS.Timeout | undefined;
  return watch(dir, (_event, filename) => {
    if (filename !== name) return;
    clearTimeout(timer);
    timer = setTimeout(onChange, 150);
  });
}

/** Bind to the first free port at or after `start` (scanning a small range). */
function listen(server: Server, start: number): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = start;
    const attempts = 20;

    const tryPort = (): void => {
      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && port < start + attempts) {
          port += 1;
          tryPort();
        } else {
          reject(err);
        }
      });
      server.listen(port, '127.0.0.1', () => {
        resolve(port);
      });
    };

    tryPort();
  });
}
