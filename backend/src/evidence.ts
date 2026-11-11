import type { Facts } from './corpus';
import type { Source } from './retrieval';
import { fold, hasStem, stem, stems } from './text';
import { termsIn } from './vocabulary';

/**
 * The evidence floor: a question reaches a writer only when the retrieved
 * passages contain what it asks about. Vector search always returns its
 * nearest passages, even for "what is the weather today?", so "something
 * was retrieved" proves nothing. This checks, in code, that the passages
 * share enough of the question's own words — and the writer is never called
 * when they do not.
 */

/** Words that say nothing about what is asked: every article is about the platform and its applications. */
const GENERIC = new Set(
  ['platform', 'platformun', 'application', 'applications', 'uygulama', 'uygulamalar', 'help', 'center', 'yardim', 'merkezi', 'question', 'soru', 'answer', 'yanit']
    .map(stem),
);

/** At least half of the question's salient stems must occur in the passages the writer would see. */
export const EVIDENCE_FLOOR = 0.5;
/** How many of the top passages count as "what the writer would see" for the floor. */
export const EVIDENCE_PASSAGES = 3;

/** The question's word stems that carry its subject. */
export function salientStems(question: string): string[] {
  return stems(question).filter((term) => !GENERIC.has(term));
}

export interface Evidence {
  terms: string[];
  found: string[];
  ratio: number;
}

/** Which salient stems of the question the top passages contain. */
export function evidenceFor(question: string, sources: readonly Source[], passages = EVIDENCE_PASSAGES): Evidence {
  const terms = salientStems(question);
  const text = fold(
    sources
      .slice(0, passages)
      .map((source) => `${source.title}\n${source.text}`)
      .join('\n'),
  );
  const found = terms.filter((term) => hasStem(text, term));
  return { terms, found, ratio: terms.length === 0 ? 1 : found.length / terms.length };
}

/** True when the passages hold enough of the question to answer it from. A question of only generic words passes. */
export function meetsFloor(evidence: Evidence): boolean {
  return evidence.terms.length === 0 || evidence.ratio >= EVIDENCE_FLOOR;
}

/**
 * True when the question names technologies and none of them appears in any
 * article — "which Kubernetes version does it need?". No passage can answer
 * that, so it is not covered, whatever retrieval returns.
 */
export function namesOnlyAbsentTerms(question: string, facts: Facts): boolean {
  const named = termsIn(question, facts).map((mention) => facts.glossary.find((term) => term.id === mention.id)!);
  return named.length > 0 && named.every((term) => !term.present);
}
