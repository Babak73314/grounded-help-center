import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi, MAX_ASK_BYTES, resetFactsCache } from '../api';
import { loadAssistantConfig } from '../config';
import { migrate } from '../db/migrate';
import { migrations } from '../db/migrations';
import { PgClient } from '../db/pg';
import { ingest } from '../ingest';
import { buildEmbedder, buildModel, log, type Services } from '../services';
import { MIME_TYPES, resolveStatic } from './static';

/**
 * Runs the whole help center on one machine: the static export in `out/`
 * (build it first with `npm run build` at the repository root) and the same
 * API the Lambda function serves, on a local PostgreSQL with pgvector
 * (`docker compose up -d`). On start it applies the migrations and loads the
 * corpus the build wrote; passages that have not changed are not embedded
 * again.
 */
const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
/** The database `docker-compose.yml` starts; override with DATABASE_URL. */
const DEFAULT_DATABASE_URL = 'postgres://help:help@127.0.0.1:5433/help';

function readBody(request: IncomingMessage, limit: number): Promise<string | 'too-large'> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
    });
    request.on('end', () => resolve(size > limit ? 'too-large' : Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function sendFile(response: ServerResponse, status: number, file: string, method: string): void {
  if (!existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  response.writeHead(status, { 'content-type': MIME_TYPES[extname(file)] ?? 'application/octet-stream' });
  if (method === 'HEAD') response.end();
  else createReadStream(file).pipe(response);
}

/** The request handler: `/api/*` to the API, everything else to the static export. */
export function localHandler(outDir: string, services: Services) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const url = request.url ?? '/';
    const method = request.method ?? 'GET';
    if (url.startsWith('/api/')) {
      const body = await readBody(request, MAX_ASK_BYTES);
      const result =
        body === 'too-large'
          ? { status: 413, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({ error: 'too_large' }) }
          : await handleApi(
              {
                method,
                path: url.split('?')[0]!,
                headers: Object.fromEntries(Object.entries(request.headers).map(([name, value]) => [name, Array.isArray(value) ? value[0] : value])),
                body,
                clientAddress: request.socket.remoteAddress ?? 'unknown',
              },
              services,
            );
      response.writeHead(result.status, result.headers);
      response.end(result.body);
      return;
    }
    const found = resolveStatic(outDir, url);
    if (found.status === 301) {
      response.writeHead(301, { location: found.location });
      response.end();
      return;
    }
    sendFile(response, found.status, found.file, method);
  };
}

export async function startLocalServer(options: { outDir: string; port: number; host: string; services: Services }): Promise<Server> {
  const handle = localHandler(options.outDir, options.services);
  const server = createServer((request, response) => {
    handle(request, response).catch(() => {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Internal error');
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.host, () => resolve());
  });
  return server;
}

async function main(): Promise<void> {
  const outDir = process.env.OUT_DIR ?? join(REPOSITORY_ROOT, 'out');
  const corpusFile = join(outDir, 'help', 'corpus.json');
  if (!existsSync(corpusFile)) {
    console.error(`No corpus at ${corpusFile}. Build the site first: npm run build (in the repository root).`);
    process.exit(1);
  }
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '127.0.0.1';
  const config = loadAssistantConfig();
  const { db, close } = PgClient.connect(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL);
  const services: Services = {
    db,
    embedder: buildEmbedder(config),
    model: buildModel(config),
    limits: config.limits,
    allowedOrigins: [`http://${host}:${port}`, `http://localhost:${port}`],
  };

  const applied = await migrate(db, migrations);
  const report = await ingest(db, JSON.parse(readFileSync(corpusFile, 'utf8')) as unknown, services.embedder);
  resetFactsCache();
  log('local-start', { applied, ingest: report, writer: config.model.provider, embedder: services.embedder.id });

  const server = await startLocalServer({ outDir, port, host, services });
  console.log(`Help center at http://${host}:${port}/`);
  const stop = () => server.close(() => void close().then(() => process.exit(0)));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
