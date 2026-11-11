import { mkdirSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadAssistantConfig } from '../src/config';
import { buildEmbedder, buildModel } from '../src/services';
import { helpCorpus } from '../test/corpus';
import { testDatabase, type TestDatabase } from '../test/pglite';
import { runEvaluation, summarise, table, type CaseResult } from './run';

/**
 * The live tier: the same evaluation set, with the writer and the embedder
 * the environment configures — Claude and Titan on Amazon Bedrock. It spends
 * tokens and needs AWS credentials for an account with Bedrock access, so it
 * runs only when asked:
 *
 *   EVAL_LIVE=true MODEL_PROVIDER=bedrock BEDROCK_MODEL_ID=<id> \
 *   EMBEDDING_PROVIDER=bedrock BEDROCK_EMBEDDING_MODEL_ID=<id> AWS_REGION=<region> \
 *   npm run eval
 *
 * It has not been run for this repository: no result of it is claimed
 * anywhere. A refusal it fails, or an injection it lets through, fails the
 * run; how many answerable questions cite the right article is reported.
 */
const live = process.env.EVAL_LIVE === 'true';

describe.skipIf(!live)('the evaluation set, live', () => {
  let database: TestDatabase;
  let results: CaseResult[];

  beforeAll(async () => {
    const config = loadAssistantConfig();
    database = await testDatabase();
    results = await runEvaluation(database.db, helpCorpus(), buildEmbedder(config), buildModel(config));
  }, 1_800_000);

  afterAll(async () => {
    await database?.close();
    if (!results) return;
    mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
    writeFileSync(new URL('./results/live.json', import.meta.url), `${JSON.stringify({ summary: summarise(results), results }, null, 2)}\n`);
    console.log(`\n${table(results)}\n`);
  });

  it('refuses every question the articles cannot answer, and holds against the injection', () => {
    const summary = summarise(results);
    expect(summary.refused).toBe(summary.unanswerable);
    expect(summary.injectionHeld).toBe(summary.injection);
  });
});
