import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { afterEach, describe, expect, it } from 'vitest';
import { checksum, migrate } from '../src/db/migrate';
import { migrations } from '../src/db/migrations';
import { parameterNames, splitStatements, toPositional, vectorLiteral } from '../src/db/sql';
import { PgliteClient, testDatabase, type TestDatabase } from './pglite';

describe('named parameters', () => {
  it('become positional, each name once, casts left alone', () => {
    const sql = "SELECT CAST(:v AS vector), :a, :b, :a, now()::text, '1 day'::interval";
    expect(parameterNames(sql)).toEqual(['v', 'a', 'b']);
    expect(toPositional(sql, { v: '[1]', a: 1, b: 'x' })).toEqual({
      text: "SELECT CAST($1 AS vector), $2, $3, $2, now()::text, '1 day'::interval",
      values: ['[1]', 1, 'x'],
    });
  });

  it('refuse a missing value and an unused one', () => {
    expect(() => toPositional('SELECT :a', {})).toThrow(/:a has no value/);
    expect(() => toPositional('SELECT :a', { a: 1, b: 2 })).toThrow(/b is not used/);
  });

  it('split a migration at semicolons that end a line, ignoring comment-only pieces', () => {
    expect(splitStatements("SELECT 1;\n-- note\nSELECT ';' AS x;\n  ;\nSELECT 2;")).toEqual(['SELECT 1', "-- note\nSELECT ';' AS x", 'SELECT 2']);
  });

  it('write a vector PostgreSQL can read and refuse a broken one', () => {
    expect(vectorLiteral([0.5, -1, 2e-3])).toBe('[0.5,-1,0.002]');
    expect(() => vectorLiteral([0, Number.NaN])).toThrow();
  });
});

describe('migrations', () => {
  let database: TestDatabase | undefined;
  afterEach(async () => {
    await database?.close();
    database = undefined;
  });

  it('apply once, then find nothing to do', async () => {
    database = await testDatabase();
    expect(await migrate(database.db, migrations)).toEqual([]);
    const rows = await database.db.query<{ id: string; checksum: string }>('SELECT id, checksum FROM schema_migrations ORDER BY id');
    expect(rows).toEqual(migrations.map((migration) => ({ id: migration.id, checksum: checksum(migration.sql) })));
  });

  it('create the schema the code expects, with pgvector and full-text search', async () => {
    database = await testDatabase();
    const tables = await database.db.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    expect(tables.map((row) => row.table_name)).toEqual(['ask_events', 'content_chunks', 'help_facts', 'rate_limits', 'schema_migrations', 'settings']);
    const extension = await database.db.query<{ extname: string }>("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    expect(extension).toEqual([{ extname: 'vector' }]);
    const salt = await database.db.query<{ value: string }>("SELECT value FROM settings WHERE key = 'rate_key_salt'");
    expect(salt[0]?.value).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuse to run when an applied migration was edited', async () => {
    database = await testDatabase();
    const edited = [{ ...migrations[0]!, sql: `${migrations[0]!.sql}\n-- edited` }];
    await expect(migrate(database.db, edited)).rejects.toThrow(/changed after it was applied/);
  });

  it('refuse to run against a database with a migration the code does not know', async () => {
    database = await testDatabase();
    await database.db.query("INSERT INTO schema_migrations (id, checksum) VALUES ('999-future', 'x')");
    await expect(migrate(database.db, migrations)).rejects.toThrow(/999-future/);
  });

  it('roll back a migration that fails halfway, leaving nothing behind', async () => {
    const pg = await PGlite.create({ extensions: { vector } });
    const db = new PgliteClient(pg);
    try {
      await expect(
        migrate(db, [{ id: '001-broken', sql: 'CREATE TABLE half_done (id int);\nSELECT * FROM missing_table;' }]),
      ).rejects.toThrow();
      const tables = await db.query("SELECT 1 FROM information_schema.tables WHERE table_name IN ('half_done', 'schema_migrations')");
      expect(tables).toEqual([]);
    } finally {
      await pg.close();
    }
  });

  it('refuse duplicate or unordered ids', async () => {
    database = await testDatabase();
    await expect(migrate(database.db, [migrations[0]!, migrations[0]!])).rejects.toThrow(/share an id/);
    await expect(
      migrate(database.db, [
        { id: '002-b', sql: 'SELECT 1;' },
        { id: '001-a', sql: 'SELECT 1;' },
      ]),
    ).rejects.toThrow(/order/);
  });
});
