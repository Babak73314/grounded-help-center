import { mkdirSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HashingEmbedder } from '../src/embeddings/hashing';
import { ExtractiveAnswerModel } from '../src/models/extractive';
import { helpCorpus } from '../test/corpus';
import { testDatabase, type TestDatabase } from '../test/pglite';
import { heldOut } from './held-out';
import { questions } from './questions';
import { runEvaluation, summarise, table, type CaseResult } from './run';

/**
 * The held-out set (`held-out.ts`) against the same local build as the
 * offline evaluation: PostgreSQL with pgvector in WebAssembly, the hashing
 * embedder and the extractive writer. It records the result and asserts no
 * score, so that it cannot be tuned to a number; it fails only if the set
 * itself is malformed.
 */

let database: TestDatabase;
let results: CaseResult[];

beforeAll(async () => {
  database = await testDatabase();
  results = await runEvaluation(database.db, helpCorpus(), new HashingEmbedder(), new ExtractiveAnswerModel(), heldOut);
}, 120_000);

afterAll(async () => {
  await database?.close();
  if (!results) return;
  const summary = summarise(results);
  mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
  writeFileSync(
    new URL('./results/held-out.json', import.meta.url),
    `${JSON.stringify({ writer: 'extractive', embedder: 'hashing-v1', summary, results }, null, 2)}\n`,
  );
  console.log(`\n${table(results)}\n`);
  console.log(`Held-out: ${summary.answeredWithRightArticle}/${summary.answerable} answerable cases cited the right article.`);
});

describe('the held-out set, offline', () => {
  it('asks 8 answerable questions, each in English and Turkish, none of them from the original set', () => {
    expect(heldOut).toHaveLength(8);
    expect(heldOut.every((question) => question.expect.kind === 'answer')).toBe(true);
    const originalIds = new Set(questions.map((question) => question.id));
    const originalTexts = new Set(questions.flatMap((question) => [question.en, question.tr]));
    for (const question of heldOut) {
      expect(originalIds.has(question.id), question.id).toBe(false);
      expect(originalTexts.has(question.en) || originalTexts.has(question.tr), question.id).toBe(false);
    }
    expect(results).toHaveLength(16);
  });

  it('expects only articles that exist', () => {
    const slugs = new Set(helpCorpus().chunks.map((chunk) => chunk.article));
    for (const question of heldOut) {
      if (question.expect.kind !== 'answer') continue;
      for (const article of question.expect.articles) expect(slugs.has(article), `${question.id}: ${article}`).toBe(true);
    }
  });
});
