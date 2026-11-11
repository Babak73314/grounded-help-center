import {
  BeginTransactionCommand,
  CommitTransactionCommand,
  ExecuteStatementCommand,
  RDSDataClient,
  RollbackTransactionCommand,
  type SqlParameter,
} from '@aws-sdk/client-rds-data';
import { checkParameters, DatabaseWarmingError, type Row, type SqlClient, type SqlParams, type SqlValue } from './sql';

export interface DataApiTarget {
  /** The Aurora cluster's ARN. */
  resourceArn: string;
  /** The Secrets Manager secret holding the database credentials. */
  secretArn: string;
  database: string;
}

export interface DataApiOptions {
  /**
   * How long one call may wait for a paused database to resume. Aurora
   * typically resumes in about 15 seconds (30 or more after a day paused); a
   * call that waits longer than this throws `DatabaseWarmingError` so the
   * caller can say "try again shortly" instead of holding the request.
   */
  resumeWaitMs: number;
  /** Time between attempts while the database resumes. */
  resumePollMs: number;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

const DEFAULT_OPTIONS: DataApiOptions = {
  resumeWaitMs: 25_000,
  resumePollMs: 2_000,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

function toParameter(name: string, value: SqlValue): SqlParameter {
  if (value === null) return { name, value: { isNull: true } };
  if (typeof value === 'boolean') return { name, value: { booleanValue: value } };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { name, value: { longValue: value } } : { name, value: { doubleValue: value } };
  }
  return { name, value: { stringValue: value } };
}

/**
 * The Data API answers a request to a paused cluster at once with this error
 * — and starts resuming the cluster. The SDK does not retry it (a client
 * fault), so the client here does.
 */
export function isResuming(error: unknown): boolean {
  return error instanceof Error && error.name === 'DatabaseResumingException';
}

/** PostgreSQL through the RDS Data API: HTTPS and IAM, so the Lambda needs no VPC and holds no connection. */
export class DataApiClient implements SqlClient {
  private readonly options: DataApiOptions;

  constructor(
    private readonly target: DataApiTarget,
    private readonly client: RDSDataClient = new RDSDataClient({}),
    options: Partial<DataApiOptions> = {},
    private readonly transactionId?: string,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async query<T extends Row = Row>(sql: string, params: SqlParams = {}): Promise<T[]> {
    const names = checkParameters(sql, params);
    const result = await this.whileResuming(() =>
      this.client.send(
        new ExecuteStatementCommand({
          resourceArn: this.target.resourceArn,
          secretArn: this.target.secretArn,
          database: this.target.database,
          sql,
          parameters: names.map((name) => toParameter(name, params[name]!)),
          formatRecordsAs: 'JSON',
          transactionId: this.transactionId,
        }),
      ),
    );
    return result.formattedRecords ? (JSON.parse(result.formattedRecords) as T[]) : [];
  }

  async transaction<R>(work: (tx: SqlClient) => Promise<R>): Promise<R> {
    if (this.transactionId) return work(this);
    const { resourceArn, secretArn, database } = this.target;
    const { transactionId } = await this.whileResuming(() => this.client.send(new BeginTransactionCommand({ resourceArn, secretArn, database })));
    if (!transactionId) throw new Error('The Data API returned no transaction id.');
    try {
      const result = await work(new DataApiClient(this.target, this.client, this.options, transactionId));
      await this.client.send(new CommitTransactionCommand({ resourceArn, secretArn, transactionId }));
      return result;
    } catch (error) {
      // The original failure is the one worth reporting.
      await this.client.send(new RollbackTransactionCommand({ resourceArn, secretArn, transactionId })).catch(() => undefined);
      throw error;
    }
  }

  /** Repeats `call` while the database is resuming from its pause, within the wait allowed. */
  private async whileResuming<T>(call: () => Promise<T>): Promise<T> {
    const started = this.options.now();
    for (;;) {
      try {
        return await call();
      } catch (error) {
        if (!isResuming(error)) throw error;
        const waited = this.options.now() - started;
        if (waited + this.options.resumePollMs > this.options.resumeWaitMs) throw new DatabaseWarmingError(waited);
        await this.options.sleep(this.options.resumePollMs);
      }
    }
  }
}
