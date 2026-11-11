import pg from 'pg';
import { toPositional, type Row, type SqlClient, type SqlParams } from './sql';

/**
 * PostgreSQL over its own wire protocol, for running the help center on a
 * local database (`docker compose up`). The same SQL runs here, in PGlite in
 * the tests and through the RDS Data API in AWS.
 */
export class PgClient implements SqlClient {
  constructor(private readonly target: pg.Pool | pg.PoolClient) {}

  static connect(connectionString: string): { db: PgClient; close: () => Promise<void> } {
    const pool = new pg.Pool({ connectionString, max: 5 });
    return { db: new PgClient(pool), close: () => pool.end() };
  }

  async query<T extends Row = Row>(sql: string, params: SqlParams = {}): Promise<T[]> {
    const { text, values } = toPositional(sql, params);
    const result = await this.target.query(text, values);
    // The Data API returns timestamps as strings; do the same so every client looks alike.
    return result.rows.map((row: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value])),
    ) as T[];
  }

  async transaction<R>(work: (tx: SqlClient) => Promise<R>): Promise<R> {
    if (!(this.target instanceof pg.Pool)) return work(this);
    const client = await this.target.connect();
    try {
      await client.query('BEGIN');
      const result = await work(new PgClient(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      // The original failure is the one worth reporting.
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
