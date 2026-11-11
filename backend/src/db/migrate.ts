import { createHash } from 'node:crypto';
import type { Migration } from './migrations';
import { splitStatements, type SqlClient } from './sql';

export function checksum(sql: string): string {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

/**
 * Applies the migrations not applied yet, in order, all in one transaction
 * behind an advisory lock — two deployments running at once cannot both
 * apply the same file. An applied migration whose text has since changed
 * stops everything: the database no longer matches the code that claims to
 * describe it.
 *
 * @returns the ids applied by this run
 */
export async function migrate(db: SqlClient, migrations: readonly Migration[]): Promise<string[]> {
  const ids = migrations.map((migration) => migration.id);
  if (new Set(ids).size !== ids.length) throw new Error('Two migrations share an id.');
  if (ids.join('\n') !== [...ids].sort().join('\n')) throw new Error('Migrations are not in id order.');

  return db.transaction(async (tx) => {
    await tx.query(`SELECT pg_advisory_xact_lock(hashtext('help-center-migrations'))`);
    await tx.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         id text PRIMARY KEY,
         checksum text NOT NULL,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    const applied = await tx.query<{ id: string; checksum: string }>('SELECT id, checksum FROM schema_migrations');
    const appliedById = new Map(applied.map((row) => [row.id, row.checksum]));

    for (const row of applied) {
      if (!ids.includes(row.id)) throw new Error(`The database has migration ${row.id}, which this code does not know.`);
    }

    const done: string[] = [];
    for (const migration of migrations) {
      const sum = checksum(migration.sql);
      const previous = appliedById.get(migration.id);
      if (previous !== undefined) {
        if (previous !== sum) throw new Error(`Migration ${migration.id} was changed after it was applied.`);
        continue;
      }
      for (const statement of splitStatements(migration.sql)) await tx.query(statement);
      await tx.query('INSERT INTO schema_migrations (id, checksum) VALUES (:id, :checksum)', { id: migration.id, checksum: sum });
      done.push(migration.id);
    }
    return done;
  });
}
