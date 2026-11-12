import { mkdirSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HashingEmbedder } from '../src/embeddings/hashing';
import { ExtractiveAnswerModel } from '../src/models/extractive';
import { helpCorpus } from '../test/corpus';
import { testDatabase, type TestDatabase } from '../test/pglite';
import { questions } from './questions';
import { runEvaluation, summarise, table, type CaseResult } from './run';

/**
 * The evaluation set against the build CI runs: PostgreSQL with pgvector (in
 * WebAssembly), the local hashing embedder and the local extractive writer.
 * Every question goes through routing, retrieval, the evidence floor, the
 * writer and the answer check, in English and in Turkish. No network, no key.
 *
 * What it measures: whether an answerable question is answered from the
 * right article, and whether an unanswerable one is refused. What it does not
 * measure: how well a language model writes — that is the live evaluation
 * (`live.test.ts`), which needs Amazon Bedrock and has not been run.
 */

/** The floor: the original set's result before the ranking change (docs/EVALUATION.md); a change that lowers it fails here. */
const RECORDED = { answeredWithRightArticle: 39, answerable: 40 };

let database: TestDatabase;
let results: CaseResult[];

beforeAll(async () => {
  database = await testDatabase();
  results = await runEvaluation(database.db, helpCorpus(), new HashingEmbedder(), new ExtractiveAnswerModel());
}, 120_000);

afterAll(async () => {
  await database?.close();
  if (!results) return;
  const summary = summarise(results);
  mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
  writeFileSync(
    new URL('./results/offline.json', import.meta.url),
    `${JSON.stringify({ writer: 'extractive', embedder: 'hashing-v1', summary, results }, null, 2)}\n`,
  );
  console.log(`\n${table(results)}\n`);
  console.log(
    `Answerable: ${summary.answeredWithRightArticle}/${summary.answerable} cited the right article. ` +
      `Unanswerable: ${summary.refused}/${summary.unanswerable} refused. Injection: ${summary.injectionHeld}/${summary.injection} held.`,
  );
});

describe('the evaluation set, offline', () => {
  it('asks 27 questions, each in English and Turkish, 7 of them unanswerable or adversarial', () => {
    expect(questions).toHaveLength(27);
    expect(new Set(questions.map((question) => question.id)).size).toBe(27);
    expect(questions.filter((question) => question.expect.kind !== 'answer')).toHaveLength(7);
    expect(results).toHaveLength(54);
  });

  it('refuses every question the articles cannot answer', () => {
    const summary = summarise(results);
    expect(summary.refused).toBe(summary.unanswerable);
  });

  it('never lets an instruction inside the question make the assistant claim something', () => {
    const summary = summarise(results);
    expect(summary.injectionHeld).toBe(summary.injection);
  });

  it(`answers at least ${RECORDED.answeredWithRightArticle} of ${RECORDED.answerable} answerable cases from the right article`, () => {
    const summary = summarise(results);
    expect(summary.answerable).toBe(RECORDED.answerable);
    expect(summary.answeredWithRightArticle).toBeGreaterThanOrEqual(RECORDED.answeredWithRightArticle);
  });

  it('never calls the writer for a refused question', () => {
    for (const result of results.filter((entry) => entry.outcome === 'out-of-scope' || entry.outcome === 'not-covered')) {
      expect(result.telemetry.attempts, `${result.id}/${result.locale}`).toBe(0);
    }
  });

  it('delivers every drafted answer on the first attempt: the extractive writer quotes, so the check passes it', () => {
    for (const result of results.filter((entry) => entry.outcome === 'grounded')) {
      expect(result.telemetry.gateFailures, `${result.id}/${result.locale}`).toEqual([]);
      expect(result.telemetry.attempts).toBe(1);
    }
  });
});
