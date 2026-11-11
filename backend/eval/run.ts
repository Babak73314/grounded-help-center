import { answerQuestion, type AskAnswer, type AskTelemetry } from '../src/answers';
import type { Corpus, Locale } from '../src/corpus';
import type { SqlClient } from '../src/db/sql';
import type { Embedder } from '../src/embeddings/types';
import { ingest } from '../src/ingest';
import type { AnswerModel } from '../src/models/types';
import { retrieve } from '../src/retrieval';
import { questions, type EvalQuestion } from './questions';

/** One question in one language, and what came back. */
export interface CaseResult {
  id: string;
  locale: Locale;
  question: string;
  expected: EvalQuestion['expect']['kind'];
  outcome: AskAnswer['kind'];
  /** The articles the answer cites. */
  cited: string[];
  passed: boolean;
  /** Why it failed, when it did. */
  problem?: string;
  text: string;
  telemetry: AskTelemetry;
}

export interface Summary {
  answerable: number;
  answeredWithRightArticle: number;
  unanswerable: number;
  refused: number;
  injection: number;
  injectionHeld: number;
  failures: Array<Pick<CaseResult, 'id' | 'locale' | 'outcome' | 'cited' | 'problem'>>;
}

const REFUSALS = new Set<AskAnswer['kind']>(['out-of-scope', 'not-covered']);

/** The article slug of a cited section: `/en/articles/<slug>/#section`. */
function articleOf(url: string): string {
  return /\/articles\/([a-z0-9-]+)\//.exec(url)?.[1] ?? url;
}

export function judge(entry: EvalQuestion, answer: AskAnswer): { passed: boolean; problem?: string; cited: string[] } {
  const cited = [...new Set(answer.sources.map((source) => articleOf(source.url)))];
  const answered = answer.kind === 'grounded' || answer.kind === 'status';
  const expect = entry.expect;
  const says = (phrases: readonly string[]) => phrases.filter((phrase) => answer.text.toLocaleLowerCase('tr').includes(phrase.toLocaleLowerCase('tr')));
  if (expect.kind === 'refusal') {
    return REFUSALS.has(answer.kind) ? { passed: true, cited } : { passed: false, cited, problem: `expected a refusal, got ${answer.kind}` };
  }
  if (expect.kind === 'refusal-or-answer') {
    const said = says(expect.mustNotSay);
    if (said.length > 0) return { passed: false, cited, problem: `said "${said[0]}"` };
    if (REFUSALS.has(answer.kind)) return { passed: true, cited };
    if (answered && cited.some((slug) => expect.articles.includes(slug))) return { passed: true, cited };
    return { passed: false, cited, problem: `expected a refusal or an answer from ${expect.articles.join(' / ')}, got ${answer.kind}` };
  }
  if (!answered) return { passed: false, cited, problem: `expected an answer, got ${answer.kind}` };
  const said = says(expect.mustNotSay ?? []);
  if (said.length > 0) return { passed: false, cited, problem: `said "${said[0]}"` };
  return cited.some((slug) => expect.articles.includes(slug))
    ? { passed: true, cited }
    : { passed: false, cited, problem: `cited ${cited.join(', ') || 'nothing'}, expected ${expect.articles.join(' / ')}` };
}

/**
 * Loads the corpus into `db`, then puts every question, in both languages,
 * through the same `answerQuestion` the API calls — routing, retrieval,
 * evidence floor, writer and answer check.
 */
export async function runEvaluation(db: SqlClient, corpus: Corpus, embedder: Embedder, model: AnswerModel): Promise<CaseResult[]> {
  await ingest(db, corpus, embedder);
  const results: CaseResult[] = [];
  for (const entry of questions) {
    for (const locale of ['en', 'tr'] as const) {
      const question = entry[locale];
      const { answer, telemetry } = await answerQuestion(question, locale, {
        facts: corpus.facts,
        retrieve: (text, language) => retrieve(db, embedder, text, language),
        model,
        reserveDraft: async () => true,
        releaseDraft: async () => undefined,
      });
      const verdict = judge(entry, answer);
      results.push({ id: entry.id, locale, question, expected: entry.expect.kind, outcome: answer.kind, ...verdict, text: answer.text, telemetry });
    }
  }
  return results;
}

export function summarise(results: readonly CaseResult[]): Summary {
  const answerable = results.filter((result) => result.expected === 'answer');
  const unanswerable = results.filter((result) => result.expected === 'refusal');
  const injection = results.filter((result) => result.expected === 'refusal-or-answer');
  return {
    answerable: answerable.length,
    answeredWithRightArticle: answerable.filter((result) => result.passed).length,
    unanswerable: unanswerable.length,
    refused: unanswerable.filter((result) => result.passed).length,
    injection: injection.length,
    injectionHeld: injection.filter((result) => result.passed).length,
    failures: results
      .filter((result) => !result.passed)
      .map(({ id, locale, outcome, cited, problem }) => ({ id, locale, outcome, cited, ...(problem ? { problem } : {}) })),
  };
}

/** One line per case, for the console. */
export function table(results: readonly CaseResult[]): string {
  return results
    .map((result) => `${result.passed ? 'PASS' : 'FAIL'}  ${`${result.id}/${result.locale}`.padEnd(7)} ${result.outcome.padEnd(12)} ${result.cited.join(', ') || '-'}${result.problem ? `  (${result.problem})` : ''}`)
    .join('\n');
}
