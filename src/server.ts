import { createServer, type Server } from 'node:http';

import { buildHtml } from './build-html.ts';
import { buildInspectorData } from './model.ts';
import { resolveForFile } from './resolve.ts';
import type { VitePlusConfig } from './types.ts';

export type InspectorServer = {
  url: string;
  port: number;
  close: () => Promise<void>;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/**
 * Start the inspector HTTP server bound to localhost. Serves the rendered page
 * at `/`, the raw view-model at `/__config.json`, and per-file rule resolution
 * at `/__resolve?file=<path>`.
 */
export async function startServer(
  config: VitePlusConfig,
  configPath: string,
  preferredPort: number,
): Promise<InspectorServer> {
  const data = buildInspectorData(config, configPath);
  const html = buildHtml(data);

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (url.pathname === '/__config.json') {
      res.writeHead(200, JSON_HEADERS);
      res.end(JSON.stringify(data));
      return;
    }

    if (url.pathname === '/__resolve') {
      const file = url.searchParams.get('file') ?? '';
      const result = config.lint
        ? resolveForFile(config.lint, file)
        : { file, matchedOverrides: [], rules: [] };
      res.writeHead(200, JSON_HEADERS);
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(html);
  });

  const port = await listen(server, preferredPort);
  return {
    url: `http://localhost:${port}`,
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
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
