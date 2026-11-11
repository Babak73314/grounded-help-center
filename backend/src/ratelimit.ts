import { createHash } from 'node:crypto';
import type { SqlClient } from './db/sql';

export interface Window {
  bucket: string;
  /** Who is counted: a hashed caller, or `*` for everyone together. */
  key: string;
  limit: number;
  seconds: number;
}

export interface Verdict {
  allowed: boolean;
  /** Seconds until the window that refused resets; 0 when allowed. */
  retryAfter: number;
}

/**
 * Counts one use against each window, atomically, and allows the use only
 * when every window still has room. Counting is one statement per window —
 * `INSERT … ON CONFLICT DO UPDATE … RETURNING` — so two requests at the same
 * moment cannot both take the last permit.
 *
 * A refused request still counts: a caller hammering the endpoint stays
 * refused instead of being let through again the moment one slot frees.
 */
export async function consume(db: SqlClient, windows: readonly Window[], now: Date = new Date()): Promise<Verdict> {
  let retryAfter = 0;
  for (const window of windows) {
    const nowSeconds = Math.floor(now.getTime() / 1000);
    const start = nowSeconds - (nowSeconds % window.seconds);
    const rows = await db.query<{ hits: number }>(
      `INSERT INTO rate_limits (bucket, key, window_start, hits)
       VALUES (:bucket, :key, to_timestamp(:start), 1)
       ON CONFLICT (bucket, key, window_start) DO UPDATE SET hits = rate_limits.hits + 1
       RETURNING hits`,
      { bucket: window.bucket, key: window.key, start },
    );
    const hits = Number(rows[0]?.hits ?? Number.POSITIVE_INFINITY);
    if (hits > window.limit) retryAfter = Math.max(retryAfter, start + window.seconds - nowSeconds);
  }
  return { allowed: retryAfter === 0, retryAfter };
}

/** Releases one use of a window — for a model answer that was never written (the cap counts answers, not attempts). */
export async function release(db: SqlClient, window: Window, now: Date = new Date()): Promise<void> {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const start = nowSeconds - (nowSeconds % window.seconds);
  await db.query(
    `UPDATE rate_limits SET hits = hits - 1
     WHERE bucket = :bucket AND key = :key AND window_start = to_timestamp(:start) AND hits > 1`,
    { bucket: window.bucket, key: window.key, start },
  );
}

/** The caller as a counter key: a salted hash, so the table holds no address. */
export function callerKey(salt: string, address: string): string {
  return createHash('sha256').update(`${salt}\n${address}`, 'utf8').digest('hex').slice(0, 32);
}

let cachedSalt: string | undefined;

/** The salt generated inside the database by the first migration; read once per cold start. */
export async function rateKeySalt(db: SqlClient): Promise<string> {
  if (cachedSalt) return cachedSalt;
  const rows = await db.query<{ value: string }>("SELECT value FROM settings WHERE key = 'rate_key_salt'");
  const value = rows[0]?.value;
  if (!value) throw new Error('The rate-limit salt is missing; have the migrations run?');
  cachedSalt = value;
  return value;
}
