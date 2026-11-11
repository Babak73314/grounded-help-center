import { PGlite, type Transaction } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { migrate } from '../src/db/migrate';
import { migrations } from '../src/db/migrations';
import { toPositional, type Row, type SqlClient, type SqlParams } from '../src/db/sql';

/** The test double for the Data API: a real PostgreSQL (with pgvector) running in WebAssembly. */
export class PgliteClient implements SqlClient {
  constructor(private readonly db: PGlite | Transaction) {}

  async query<T extends Row = Row>(sql: string, params: SqlParams = {}): Promise<T[]> {
    const { text, values } = toPositional(sql, params);
    const result = await this.db.query<T>(text, values);
    // The Data API returns timestamps as strings; do the same so tests see what production sees.
    return result.rows.map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value])),
    ) as T[];
  }

  async transaction<R>(work: (tx: SqlClient) => Promise<R>): Promise<R> {
    if (!(this.db instanceof PGlite)) return work(this);
    return this.db.transaction((tx) => work(new PgliteClient(tx)));
  }
}

export interface TestDatabase {
  db: PgliteClient;
  pg: PGlite;
  close: () => Promise<void>;
}

/** A fresh, migrated database. */
export async function testDatabase(): Promise<TestDatabase> {
  const pg = await PGlite.create({ extensions: { vector } });
  const db = new PgliteClient(pg);
  await migrate(db, migrations);
  return { db, pg, close: () => pg.close() };
}
