import type { LambdaFunctionURLEvent } from 'aws-lambda';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { handleApi, resetFactsCache, type ApiRequest } from '../src/api';
import { DatabaseWarmingError } from '../src/db/sql';
import { HashingEmbedder } from '../src/embeddings/hashing';
import { toApiRequest, viewerAddress } from '../src/handlers/lambda-api';
import { runWithRetries } from '../src/handlers/lambda-migrate';
import { ingest } from '../src/ingest';
import { ExtractiveAnswerModel } from '../src/models/extractive';
import type { Services } from '../src/services';
import { helpCorpus } from './corpus';
import { testDatabase, type TestDatabase } from './pglite';

const ORIGIN = 'http://127.0.0.1:3000';

function request(method: string, path: string, body: unknown = '', headers: Record<string, string> = {}, clientAddress = '203.0.113.7'): ApiRequest {
  return {
    method,
    path,
    headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    clientAddress,
  };
}

let database: TestDatabase;
let services: Services;
const json = (result: { body: string }) => JSON.parse(result.body) as Record<string, unknown>;

beforeAll(async () => {
  database = await testDatabase();
  const embedder = new HashingEmbedder();
  await ingest(database.db, helpCorpus(), embedder);
  services = {
    db: database.db,
    embedder,
    model: new ExtractiveAnswerModel(),
    limits: { askPer10Minutes: 4, askPerDay: 40, draftsPerDay: 100 },
    allowedOrigins: [ORIGIN],
  };
});
afterAll(async () => database.close());
beforeEach(async () => {
  resetFactsCache();
  await database.db.query('DELETE FROM rate_limits');
});

describe('the API', () => {
  it('answers a status question by code and records how — not what — was asked', async () => {
    const result = await handleApi(request('POST', '/api/ask', { question: 'Is the sales website live?', locale: 'en' }), services);
    expect(result.status).toBe(200);
    expect(result.headers['cache-control']).toBe('no-store');
    const answer = json(result).answer as { kind: string; text: string };
    expect(answer.kind).toBe('status');
    expect(answer.text).toContain('LIVE [1]');
    const events = await database.db.query('SELECT * FROM ask_events ORDER BY id DESC LIMIT 1');
    expect(events[0]).toMatchObject({ route: 'status', outcome: 'status', writer: null });
    expect(JSON.stringify(events[0])).not.toContain('sales website');
  });

  it('answers a grounded question through retrieval, the evidence floor, the writer and the check', async () => {
    const result = await handleApi(request('POST', '/api/ask', { question: 'Can the shopping assistant place an order?', locale: 'en' }), services);
    const answer = json(result).answer as { kind: string; writes: string; sources: Array<{ url: string }> };
    expect(answer.kind).toBe('grounded');
    expect(answer.writes).toBe('quote');
    expect(answer.sources[0]?.url).toBe('/en/articles/commerce/#shopping-assistant');
  });

  it('refuses what the articles cannot answer', async () => {
    const result = await handleApi(request('POST', '/api/ask', { question: 'Bugün İstanbul’da hava nasıl?', locale: 'tr' }), services);
    expect((json(result).answer as { kind: string }).kind).toBe('not-covered');
  });

  it('limits questions per caller and says when to retry', async () => {
    const ask = (address: string) => handleApi(request('POST', '/api/ask', { question: 'Is the hotel demo live?', locale: 'en' }, {}, address), services);
    for (let i = 0; i < 4; i++) expect((await ask('198.51.100.1')).status).toBe(200);
    const limited = await ask('198.51.100.1');
    expect(limited.status).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect((await ask('198.51.100.2')).status).toBe(200);
  });

  it('refuses malformed, oversized, foreign-origin and wrong-method requests', async () => {
    expect((await handleApi(request('POST', '/api/ask', '{not json'), services)).status).toBe(400);
    expect((await handleApi(request('POST', '/api/ask', { question: 'Is it live?', locale: 'de' }), services)).status).toBe(400);
    expect((await handleApi(request('POST', '/api/ask', { question: 'x'.repeat(401), locale: 'en' }), services)).status).toBe(400);
    expect((await handleApi(request('POST', '/api/ask', { question: 'x', locale: 'en', pad: 'y'.repeat(5000) }), services)).status).toBe(413);
    expect((await handleApi(request('POST', '/api/ask', { question: 'Is it live?', locale: 'en' }, { origin: 'another-origin' }), services)).status).toBe(403);
    expect((await handleApi(request('POST', '/api/ask', { question: 'Is it live?', locale: 'en' }, { 'content-type': 'text/plain' }), services)).status).toBe(415);
    expect((await handleApi(request('GET', '/api/ask'), services)).status).toBe(405);
    expect((await handleApi(request('POST', '/api/admin'), services)).status).toBe(404);
    expect((await handleApi(request('GET', '/api/health'), services)).status).toBe(200);
  });

  it('checks the origin only when origins are configured; the JSON content type is required either way', async () => {
    const open: Services = { ...services, allowedOrigins: [] };
    const ask = (headers: Record<string, string>) => handleApi(request('POST', '/api/ask', { question: 'Is the hotel demo live?', locale: 'en' }, headers), open);
    expect((await ask({ origin: 'another-origin' })).status).toBe(200);
    expect((await ask({ origin: 'another-origin', 'content-type': 'application/x-www-form-urlencoded' })).status).toBe(415);
  });

  it('answers 503, without details, when something underneath fails', async () => {
    const broken: Services = { ...services, db: { query: async () => Promise.reject(new Error('secret detail')), transaction: async () => Promise.reject(new Error('x')) } };
    const result = await handleApi(request('POST', '/api/ask', { question: 'Is the hotel demo live?', locale: 'en' }), broken);
    expect(result.status).toBe(503);
    expect(result.body).not.toContain('secret detail');
  });

  it('tells the browser to try again shortly while the database resumes from its pause', async () => {
    const warming: Services = {
      ...services,
      db: { query: async () => Promise.reject(new DatabaseWarmingError(25_000)), transaction: async () => Promise.reject(new DatabaseWarmingError(25_000)) },
    };
    const result = await handleApi(request('POST', '/api/ask', { question: 'Is the hotel demo live?', locale: 'en' }), warming);
    expect(result.status).toBe(503);
    expect(json(result)).toEqual({ error: 'warming', retryAfter: 10 });
    expect(result.headers['retry-after']).toBe('10');
  });
});

describe('the Lambda function URL adapter', () => {
  function event(headers: Record<string, string>, body?: string, isBase64Encoded = false): LambdaFunctionURLEvent {
    return {
      version: '2.0',
      routeKey: '$default',
      rawPath: '/api/ask',
      rawQueryString: '',
      headers,
      requestContext: { http: { method: 'POST', path: '/api/ask', protocol: 'HTTP/1.1', sourceIp: '192.0.2.10', userAgent: 'test' } },
      body,
      isBase64Encoded,
    } as unknown as LambdaFunctionURLEvent;
  }

  it('reads the visitor address CloudFront saw, IPv6 included, and falls back to the connection', () => {
    expect(viewerAddress(event({ 'CloudFront-Viewer-Address': '2001:db8::1:46532' }))).toBe('2001:db8::1');
    expect(viewerAddress(event({}))).toBe('192.0.2.10');
  });

  it('lower-cases header names and decodes a base64 body', () => {
    const converted = toApiRequest(event({ 'Content-Type': 'application/json' }, Buffer.from('{"a":1}').toString('base64'), true));
    expect(converted).toMatchObject({ method: 'POST', path: '/api/ask', body: '{"a":1}', headers: { 'content-type': 'application/json' } });
  });
});

describe('the migration resource', () => {
  it('retries a transient failure and stops at once on a schema mismatch', async () => {
    let calls = 0;
    const flaky = {
      query: async (sql: string, params?: Record<string, string | number | boolean | null>) => {
        if (++calls === 1) throw new Error('Communications link failure');
        return database.db.query(sql, params);
      },
      transaction: <R>(work: (tx: typeof database.db) => Promise<R>) => {
        if (calls++ === 0) return Promise.reject(new Error('Communications link failure'));
        return database.db.transaction(work as never) as Promise<R>;
      },
    };
    await expect(runWithRetries(flaky as never, 3, 1)).resolves.toEqual([]);
    await database.db.query("INSERT INTO schema_migrations (id, checksum) VALUES ('999-unknown', 'x')");
    const started = Date.now();
    await expect(runWithRetries(database.db, 5, 1000)).rejects.toThrow(/does not know/);
    expect(Date.now() - started).toBeLessThan(900);
    await database.db.query("DELETE FROM schema_migrations WHERE id = '999-unknown'");
  });
});
