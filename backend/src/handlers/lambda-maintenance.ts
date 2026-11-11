import { loadDataApiTarget } from '../config';
import { DataApiClient } from '../db/data-api';
import type { SqlClient } from '../db/sql';
import { log } from '../services';

/** The daily clean-up: counters older than two days, question events older than 180 days. */
export async function cleanUp(db: SqlClient): Promise<{ rateLimits: number; askEvents: number }> {
  const rateLimits = await db.query("DELETE FROM rate_limits WHERE window_start < now() - interval '2 days' RETURNING 1 AS gone");
  const askEvents = await db.query("DELETE FROM ask_events WHERE created_at < now() - interval '180 days' RETURNING 1 AS gone");
  return { rateLimits: rateLimits.length, askEvents: askEvents.length };
}

export async function handler(): Promise<{ rateLimits: number; askEvents: number }> {
  const removed = await cleanUp(new DataApiClient(loadDataApiTarget()));
  log('maintenance', removed);
  return removed;
}
