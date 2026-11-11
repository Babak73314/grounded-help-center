import { z } from 'zod';
import { answerQuestion, type AskTelemetry } from './answers';
import { corpusSchema, type Facts, type Locale } from './corpus';
import { DatabaseWarmingError, type SqlClient } from './db/sql';
import { callerKey, consume, rateKeySalt, release, type Window } from './ratelimit';
import { retrieve } from './retrieval';
import { log, type Services } from './services';

/**
 * The help center's API, independent of what carries the request — the
 * local server or a Lambda function URL behind CloudFront:
 *
 *   POST /api/ask     { question, locale }   → 200 { answer }
 *   GET  /api/health                         → 200 { ok: true }
 *
 * A browser request must send JSON (anything else is refused before it is
 * read), and when origins are configured, come from one of them.
 *
 * In AWS the database scales to zero when idle and takes about 15 seconds
 * to resume; a request that arrives meanwhile is answered 503 `warming` with
 * a `Retry-After`, and the page asks again.
 */
export interface ApiRequest {
  method: string;
  path: string;
  /** Header names in lower case. */
  headers: Record<string, string | undefined>;
  body: string;
  /** The caller's address, for the rate limits; hashed before it is stored. */
  clientAddress: string;
}

export interface ApiResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

const askRequest = z
  .object({
    question: z.string().trim().min(3).max(400),
    locale: z.enum(['en', 'tr']),
  })
  .strict();

export const MAX_ASK_BYTES = 4 * 1024;
const FACTS_TTL_MS = 5 * 60 * 1000;
/** How soon a browser may ask again while the database resumes: by then the typical resume is over. */
const WARMING_RETRY_SECONDS = 10;

function respond(status: number, body: unknown, headers: Record<string, string> = {}): ApiResult {
  return {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

let cachedFacts: { facts: Facts; at: number } | undefined;

async function loadFacts(db: SqlClient, now: number): Promise<Facts | undefined> {
  if (cachedFacts && now - cachedFacts.at < FACTS_TTL_MS) return cachedFacts.facts;
  const rows = await db.query<{ facts: unknown }>('SELECT facts FROM help_facts WHERE id = 1');
  const raw = rows[0]?.facts;
  if (raw === undefined) return undefined;
  const facts = corpusSchema.shape.facts.parse(typeof raw === 'string' ? JSON.parse(raw) : raw);
  cachedFacts = { facts, at: now };
  return facts;
}

/** Forget cached facts (after an ingest, and in tests). */
export function resetFactsCache(): void {
  cachedFacts = undefined;
}

async function recordAsk(db: SqlClient, locale: Locale, telemetry: AskTelemetry, latencyMs: number): Promise<void> {
  await db.query(
    `INSERT INTO ask_events (locale, route, outcome, writer, attempts, input_tokens, output_tokens, latency_ms, gate_failures)
     VALUES (:locale, :route, :outcome, :writer, :attempts, :input_tokens, :output_tokens, :latency_ms, :gate_failures)`,
    {
      locale,
      route: telemetry.route,
      outcome: telemetry.outcome,
      writer: telemetry.writer,
      attempts: telemetry.attempts,
      input_tokens: telemetry.inputTokens,
      output_tokens: telemetry.outputTokens,
      latency_ms: latencyMs,
      gate_failures: telemetry.gateFailures.length > 0 ? telemetry.gateFailures.join(',') : null,
    },
  );
}

async function ask(request: ApiRequest, services: Services, now: Date): Promise<ApiResult> {
  if (Buffer.byteLength(request.body, 'utf8') > MAX_ASK_BYTES) return respond(413, { error: 'too_large' });
  let body: unknown;
  try {
    body = JSON.parse(request.body);
  } catch {
    return respond(400, { error: 'invalid' });
  }
  const parsed = askRequest.safeParse(body);
  if (!parsed.success) return respond(400, { error: 'invalid' });
  const { question, locale } = parsed.data;
  const { db, limits } = services;

  const key = callerKey(await rateKeySalt(db), request.clientAddress);
  const verdict = await consume(
    db,
    [
      { bucket: 'ask-10m', key, limit: limits.askPer10Minutes, seconds: 600 },
      { bucket: 'ask-day', key, limit: limits.askPerDay, seconds: 86_400 },
    ],
    now,
  );
  if (!verdict.allowed) return respond(429, { error: 'rate_limited', retryAfter: verdict.retryAfter }, { 'retry-after': String(verdict.retryAfter) });

  const facts = await loadFacts(db, now.getTime());
  if (!facts) return respond(503, { error: 'not_ready' });

  const draftWindow: Window = { bucket: 'drafts-day', key: '*', limit: limits.draftsPerDay, seconds: 86_400 };
  const started = Date.now();
  const { answer, telemetry } = await answerQuestion(question, locale, {
    facts,
    retrieve: (text, language) => retrieve(db, services.embedder, text, language),
    model: services.model,
    reserveDraft: async () => (await consume(db, [draftWindow], now)).allowed,
    releaseDraft: () => release(db, draftWindow, now),
  });
  const latencyMs = Date.now() - started;
  await recordAsk(db, locale, telemetry, latencyMs);
  log('ask', { locale, ...telemetry, latencyMs });
  return respond(200, { answer });
}

export async function handleApi(request: ApiRequest, services: Services, now: Date = new Date()): Promise<ApiResult> {
  const path = request.path.replace(/\/+$/, '');
  try {
    if (path === '/api/health') {
      return request.method === 'GET' ? respond(200, { ok: true }) : respond(405, { error: 'method_not_allowed' }, { allow: 'GET' });
    }
    if (path !== '/api/ask') return respond(404, { error: 'not_found' });
    if (request.method !== 'POST') return respond(405, { error: 'method_not_allowed' }, { allow: 'POST' });
    const origin = request.headers.origin;
    if (origin !== undefined && services.allowedOrigins.length > 0 && !services.allowedOrigins.includes(origin)) return respond(403, { error: 'forbidden' });
    if (!/^application\/json\b/i.test(request.headers['content-type'] ?? '')) return respond(415, { error: 'unsupported_media_type' });
    return await ask(request, services, now);
  } catch (error) {
    if (error instanceof DatabaseWarmingError) {
      log('api-warming', { path, waitedMs: error.waitedMs });
      return respond(503, { error: 'warming', retryAfter: WARMING_RETRY_SECONDS }, { 'retry-after': String(WARMING_RETRY_SECONDS) });
    }
    log('api-error', { path, error: error instanceof Error ? error.name : 'unknown' });
    return respond(503, { error: 'unavailable' });
  }
}
