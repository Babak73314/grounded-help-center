import { BeginTransactionCommand, CommitTransactionCommand, DatabaseErrorException, DatabaseResumingException, ExecuteStatementCommand, type RDSDataClient } from '@aws-sdk/client-rds-data';
import { describe, expect, it } from 'vitest';
import { DataApiClient, isResuming } from '../src/db/data-api';
import { DatabaseWarmingError } from '../src/db/sql';

/**
 * The Data API against a database that scales to zero: a request to a paused
 * cluster is refused at once with DatabaseResumingException while the cluster
 * resumes (about 15 seconds), so the client waits and asks again — within a
 * bound, after which the caller is told the database is warming up.
 */
const target = { resourceArn: 'test-cluster', secretArn: 'test-secret', database: 'help' };
const resuming = () => new DatabaseResumingException({ message: 'The DB cluster is resuming', $metadata: {} });

/** A fake RDSDataClient with a scripted sequence of outcomes and a clock that advances only when the client sleeps. */
function fake(outcomes: Array<Error | Record<string, unknown>>) {
  const sent: string[] = [];
  const slept: number[] = [];
  let clock = 0;
  const client = {
    send: async (command: { constructor: { name: string } }) => {
      sent.push(command.constructor.name);
      const next = outcomes.shift();
      if (next === undefined) throw new Error('nothing scripted');
      if (next instanceof Error) throw next;
      return next;
    },
  } as unknown as RDSDataClient;
  const db = new DataApiClient(target, client, {
    resumeWaitMs: 10_000,
    resumePollMs: 2_000,
    sleep: async (ms) => {
      slept.push(ms);
      clock += ms;
    },
    now: () => clock,
  });
  return { db, sent, slept };
}

describe('the Data API client while the database resumes', () => {
  it('recognises the one error that means "paused, resuming"', () => {
    expect(isResuming(resuming())).toBe(true);
    expect(isResuming(new DatabaseErrorException({ message: 'syntax', $metadata: {} }))).toBe(false);
    expect(isResuming(new Error('DatabaseResumingException'))).toBe(false);
  });

  it('waits and asks again until the database answers', async () => {
    const { db, sent, slept } = fake([resuming(), resuming(), { formattedRecords: '[{"n":1}]' }]);
    await expect(db.query('SELECT 1 AS n')).resolves.toEqual([{ n: 1 }]);
    expect(sent).toEqual([ExecuteStatementCommand.name, ExecuteStatementCommand.name, ExecuteStatementCommand.name]);
    expect(slept).toEqual([2_000, 2_000]);
  });

  it('gives up within the wait allowed and says the database is warming — not that it failed', async () => {
    const { db, slept } = fake(Array.from({ length: 10 }, resuming));
    const failure = await db.query('SELECT 1').catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(DatabaseWarmingError);
    // Every attempt within the 10-second allowance: at 0, 2, 4, 6, 8 and 10 seconds.
    expect((failure as DatabaseWarmingError).waitedMs).toBe(10_000);
    expect(slept).toEqual([2_000, 2_000, 2_000, 2_000, 2_000]);
  });

  it('passes every other failure through at once', async () => {
    const { db, slept } = fake([new DatabaseErrorException({ message: 'relation does not exist', $metadata: {} })]);
    await expect(db.query('SELECT 1')).rejects.toThrow('relation does not exist');
    expect(slept).toEqual([]);
  });

  it('waits for the resume when a transaction begins, then commits as usual', async () => {
    const { db, sent, slept } = fake([resuming(), { transactionId: 'tx1' }, { formattedRecords: '[{"n":2}]' }, {}]);
    const result = await db.transaction((tx) => tx.query<{ n: number }>('SELECT 2 AS n'));
    expect(result).toEqual([{ n: 2 }]);
    expect(sent).toEqual([BeginTransactionCommand.name, BeginTransactionCommand.name, ExecuteStatementCommand.name, CommitTransactionCommand.name]);
    expect(slept).toEqual([2_000]);
  });
});
