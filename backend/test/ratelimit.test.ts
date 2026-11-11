import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanUp } from '../src/handlers/lambda-maintenance';
import { callerKey, consume, rateKeySalt, release } from '../src/ratelimit';
import { testDatabase, type TestDatabase } from './pglite';

let database: TestDatabase;
beforeAll(async () => {
  database = await testDatabase();
});
afterAll(async () => database.close());

describe('rate limits', () => {
  const at = new Date('2026-11-06T10:00:30Z');

  it('allow up to the limit, then refuse with the time left in the window', async () => {
    const window = { bucket: 'test-a', key: 'k', limit: 3, seconds: 60 };
    for (let i = 0; i < 3; i++) expect((await consume(database.db, [window], at)).allowed).toBe(true);
    expect(await consume(database.db, [window], at)).toEqual({ allowed: false, retryAfter: 30 });
    // A new window starts afresh.
    expect((await consume(database.db, [window], new Date('2026-11-06T10:01:00Z'))).allowed).toBe(true);
  });

  it('refuse when any one of several windows is full', async () => {
    const small = { bucket: 'test-b-small', key: 'k', limit: 1, seconds: 600 };
    const large = { bucket: 'test-b-large', key: 'k', limit: 100, seconds: 86_400 };
    expect((await consume(database.db, [small, large], at)).allowed).toBe(true);
    const verdict = await consume(database.db, [small, large], at);
    expect(verdict.allowed).toBe(false);
    expect(verdict.retryAfter).toBe(570);
  });

  it('count concurrent requests exactly — no two take the last permit', async () => {
    const window = { bucket: 'test-c', key: 'k', limit: 5, seconds: 60 };
    const verdicts = await Promise.all(Array.from({ length: 12 }, () => consume(database.db, [window], at)));
    expect(verdicts.filter((verdict) => verdict.allowed)).toHaveLength(5);
  });

  it('release one use, never below one', async () => {
    const window = { bucket: 'test-d', key: '*', limit: 1, seconds: 60 };
    await consume(database.db, [window], at);
    await release(database.db, window, at);
    await release(database.db, window, at);
    const rows = await database.db.query<{ hits: number }>("SELECT hits FROM rate_limits WHERE bucket = 'test-d'");
    expect(rows).toEqual([{ hits: 1 }]);
  });

  it('key callers by a salted hash, never by their address', async () => {
    const salt = await rateKeySalt(database.db);
    const key = callerKey(salt, '203.0.113.7');
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(key).not.toContain('203');
    expect(callerKey(salt, '203.0.113.8')).not.toBe(key);
    expect(callerKey('another-salt', '203.0.113.7')).not.toBe(key);
  });
});

describe('the daily clean-up', () => {
  it('deletes counters older than two days and question events older than 180 days, and nothing newer', async () => {
    await database.db.query('DELETE FROM rate_limits');
    await database.db.query("INSERT INTO rate_limits (bucket, key, window_start, hits) VALUES ('old', 'k', now() - interval '3 days', 1), ('new', 'k', now(), 1)");
    await database.db.query(
      `INSERT INTO ask_events (created_at, locale, route, outcome, latency_ms)
       VALUES (now() - interval '200 days', 'en', 'grounded', 'grounded', 10), (now(), 'en', 'grounded', 'grounded', 10)`,
    );
    expect(await cleanUp(database.db)).toEqual({ rateLimits: 1, askEvents: 1 });
    expect(await database.db.query("SELECT bucket FROM rate_limits WHERE bucket IN ('old', 'new')")).toEqual([{ bucket: 'new' }]);
  });
});
