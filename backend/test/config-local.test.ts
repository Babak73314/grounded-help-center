import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadAllowedOrigins, loadAssistantConfig, loadDataApiTarget } from '../src/config';
import { HashingEmbedder } from '../src/embeddings/hashing';
import { TitanEmbedder } from '../src/embeddings/titan';
import { ingest } from '../src/ingest';
import { startLocalServer } from '../src/local/server';
import { resolveStatic } from '../src/local/static';
import { BedrockAnswerModel } from '../src/models/bedrock';
import { ExtractiveAnswerModel } from '../src/models/extractive';
import { buildEmbedder, buildModel } from '../src/services';
import { helpCorpus } from './corpus';
import { testDatabase, type TestDatabase } from './pglite';

describe('configuration', () => {
  it('runs locally with no variables at all: the extractive writer and the hashing embedder', () => {
    const config = loadAssistantConfig({});
    expect(config).toEqual({
      model: { provider: 'local' },
      embeddings: { provider: 'local' },
      limits: { askPer10Minutes: 10, askPerDay: 40, draftsPerDay: 100 },
    });
    expect(buildModel(config)).toBeInstanceOf(ExtractiveAnswerModel);
    expect(buildEmbedder(config)).toBeInstanceOf(HashingEmbedder);
  });

  it('switches each to Amazon Bedrock only when told to, and then requires its model id and region', () => {
    const env = {
      MODEL_PROVIDER: 'bedrock',
      BEDROCK_MODEL_ID: 'anthropic.example-model',
      EMBEDDING_PROVIDER: 'bedrock',
      BEDROCK_EMBEDDING_MODEL_ID: 'amazon.example-embedding',
      AWS_REGION: 'test-region',
    };
    const config = loadAssistantConfig(env);
    expect(config.model).toEqual({ provider: 'bedrock', region: 'test-region', modelId: 'anthropic.example-model', effort: 'low' });
    expect(buildModel(config)).toBeInstanceOf(BedrockAnswerModel);
    expect(buildEmbedder(config)).toBeInstanceOf(TitanEmbedder);
    expect(() => loadAssistantConfig({ MODEL_PROVIDER: 'bedrock', AWS_REGION: 'test-region' })).toThrow(/BEDROCK_MODEL_ID/);
    expect(() => loadAssistantConfig({ EMBEDDING_PROVIDER: 'bedrock', BEDROCK_EMBEDDING_MODEL_ID: 'x' })).toThrow(/AWS_REGION/);
  });

  it('names what is missing or malformed', () => {
    expect(() => loadAssistantConfig({ MODEL_PROVIDER: 'openai' })).toThrow(/MODEL_PROVIDER must be one of local, bedrock/);
    expect(() => loadAssistantConfig({ LIMIT_ASK_PER_DAY: 'many' })).toThrow(/whole number/);
    expect(() => loadAssistantConfig({ LIMIT_ASK_PER_DAY: '0' })).toThrow(/between 1/);
    expect(() => loadDataApiTarget({})).toThrow(/DB_CLUSTER_ARN/);
    expect(loadAllowedOrigins({ ALLOWED_ORIGINS: 'origin-a, origin-b' })).toEqual(['origin-a', 'origin-b']);
    expect(loadAllowedOrigins({})).toEqual([]);
  });
});

describe('the local server', () => {
  let database: TestDatabase;
  let out: string;
  let base: string;
  let close: () => Promise<void>;

  beforeAll(async () => {
    out = mkdtempSync(join(tmpdir(), 'help-center-out-'));
    mkdirSync(join(out, 'en', 'articles', 'x'), { recursive: true });
    writeFileSync(join(out, 'en', 'index.html'), '<h1>Help Center</h1>');
    writeFileSync(join(out, 'en', 'articles', 'x', 'index.html'), '<h1>Article</h1>');
    writeFileSync(join(out, '404.html'), '<h1>Not found</h1>');
    database = await testDatabase();
    const embedder = new HashingEmbedder();
    await ingest(database.db, helpCorpus(), embedder);
    const server = await startLocalServer({
      outDir: out,
      port: 0,
      host: '127.0.0.1',
      services: { db: database.db, embedder, model: new ExtractiveAnswerModel(), limits: { askPer10Minutes: 10, askPerDay: 40, draftsPerDay: 100 }, allowedOrigins: [] },
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    close = () => new Promise((resolve) => server.close(() => resolve()));
  });
  afterAll(async () => {
    await close();
    await database.close();
  });

  it('resolves paths the way the CDN does, and never outside the folder', () => {
    expect(resolveStatic(out, '/en/')).toEqual({ status: 200, file: join(out, 'en', 'index.html') });
    expect(resolveStatic(out, '/en/articles/x?y=1')).toEqual({ status: 301, location: '/en/articles/x/?y=1' });
    expect(resolveStatic(out, '/en/missing/').status).toBe(404);
    expect(resolveStatic(out, '/../../etc/passwd').status).toBe(404);
    expect(resolveStatic(out, '/%2e%2e/secret.txt').status).toBe(404);
  });

  it('serves the static pages and the API from one address', async () => {
    const page = await fetch(`${base}/en/articles/x/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('Article');
    expect((await fetch(`${base}/en/nowhere/`)).status).toBe(404);

    const ask = await fetch(`${base}/api/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: 'Is the commerce demo deployed?', locale: 'en' }),
    });
    expect(ask.status).toBe(200);
    expect(((await ask.json()) as { answer: { kind: string } }).answer.kind).toBe('status');
  });

  it('refuses an oversized request body before reading it all', async () => {
    const response = await fetch(`${base}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(10_000) });
    expect(response.status).toBe(413);
  });
});
