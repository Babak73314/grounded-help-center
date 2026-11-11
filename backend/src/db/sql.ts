/**
 * The one database interface the backend uses. Two implementations: the RDS
 * Data API in AWS (no VPC, no connection pool) and PGlite — a real PostgreSQL
 * compiled to WebAssembly — in the tests, so the SQL that ships is the SQL
 * that was tested.
 *
 * Parameters are always named (`:name`); a cast is written `CAST(:x AS type)`,
 * never `:x::type`, so the two parameter styles cannot be confused.
 */
export type SqlValue = string | number | boolean | null;
export type SqlParams = Record<string, SqlValue>;
export type Row = Record<string, unknown>;

export interface SqlClient {
  query<T extends Row = Row>(sql: string, params?: SqlParams): Promise<T[]>;
  /** Runs `work` in one transaction: committed when it resolves, rolled back when it throws. */
  transaction<R>(work: (tx: SqlClient) => Promise<R>): Promise<R>;
}

const NAMED_PARAMETER = /(?<![:\w]):([A-Za-z_][A-Za-z0-9_]*)/g;

/** The names a statement uses, in order of first appearance. */
export function parameterNames(sql: string): string[] {
  const names: string[] = [];
  for (const match of sql.matchAll(NAMED_PARAMETER)) {
    if (!names.includes(match[1]!)) names.push(match[1]!);
  }
  return names;
}

/** Fails when a statement uses a name with no value, or a value no statement uses — both are bugs. */
export function checkParameters(sql: string, params: SqlParams): string[] {
  const names = parameterNames(sql);
  for (const name of names) {
    if (!(name in params)) throw new Error(`SQL parameter :${name} has no value.`);
  }
  for (const name of Object.keys(params)) {
    if (!names.includes(name)) throw new Error(`SQL parameter ${name} is not used by the statement.`);
  }
  return names;
}

/** `:name` placeholders → `$1…`, for drivers that take positional parameters. */
export function toPositional(sql: string, params: SqlParams = {}): { text: string; values: SqlValue[] } {
  const names = checkParameters(sql, params);
  const text = sql.replace(NAMED_PARAMETER, (_, name: string) => `$${names.indexOf(name) + 1}`);
  return { text, values: names.map((name) => params[name]!) };
}

/** Splits a migration into statements: each ends with a semicolon at the end of a line. */
export function splitStatements(sql: string): string[] {
  return sql
    .split(/;[ \t]*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.replace(/--.*$/gm, '').trim() !== '');
}

/** A vector as PostgreSQL's `vector` type reads it from text: `[0.1,0.2,…]`. */
export function vectorLiteral(values: readonly number[]): string {
  if (values.some((value) => !Number.isFinite(value))) throw new Error('An embedding contains a value that is not a finite number.');
  return `[${values.join(',')}]`;
}

/**
 * The database was paused (Aurora Serverless v2 scales to zero when idle) and
 * had not finished resuming within the wait a call allows. Resuming is already
 * under way: the caller may answer "try again shortly" rather than "failed".
 */
export class DatabaseWarmingError extends Error {
  override readonly name = 'DatabaseWarmingError';

  constructor(readonly waitedMs: number) {
    super(`The database is resuming from its pause and did not answer within ${Math.round(waitedMs / 1000)} seconds.`);
  }
}
