import { salientStems } from '../evidence';
import type { Source } from '../retrieval';
import { fold, hasStem, SENTENCE_BREAK } from '../text';
import type { AnswerModel, Draft, DraftRequest } from './types';

/**
 * The local writer: no language model. It answers by quoting — it picks the
 * sentences of the retrieved passages that share the most of the question's
 * rarer words, copies them unchanged and cites each one. So it is
 * deterministic, free and runs anywhere, and every word it writes is a word
 * of a published article.
 *
 * It does not reason, summarise or translate; a question whose answer is
 * spread over several sentences gets the best three, with the list a chosen
 * sentence introduces. Its drafts go through the same answer check as a
 * model's, which is what makes the two interchangeable behind
 * `MODEL_PROVIDER`.
 */
const MAX_SENTENCES = 3;
const MAX_LIST_ITEMS = 5;
const MAX_CHARACTERS = 1200;
/** A sentence that starts like this leans on the one before it, which is quoted too. */
const LEANS_BACK = /^(they|it|its|these|this|both|bunlar|bu|her ikisi)\b/i;

export interface PassageSentence {
  text: string;
  /** Whether the sentence is an item of a list. */
  item: boolean;
}

interface Candidate extends PassageSentence {
  source: number;
  position: number;
  score: number;
  found: string[];
}

/**
 * The sentences of a passage: one or more per line, split where the answer
 * check splits them; list dashes removed, and list items marked as such.
 */
export function passageSentences(text: string): PassageSentence[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .flatMap((line) => {
      const item = /^\s*-\s+/.test(line);
      return line
        .replace(/^\s*-\s+/, '')
        .trim()
        .split(SENTENCE_BREAK)
        .map((sentence) => ({ text: sentence.trim(), item }));
    })
    .filter((sentence) => sentence.text.length > 0);
}

/** The sentence with its citation placed before the final full stop, where the answer check reads it. */
function cite(sentence: string, n: number): string {
  return `${sentence.replace(/[.!?…]+$/, '')} [${n}].`;
}

export class ExtractiveAnswerModel implements AnswerModel {
  readonly writes = 'quote' as const;

  async draft({ question, sources }: DraftRequest): Promise<Draft> {
    const usage = { writer: 'extractive', inputTokens: 0, outputTokens: 0 };
    const none: Draft = { kind: 'answer', ...usage, answer: '', citations: [], confidence: 'none' };
    const terms = salientStems(question);
    const candidates = this.candidates(sources, terms);
    if (candidates.length === 0) return none;

    let chosen: Candidate[];
    if (terms.length === 0) {
      // Nothing specific was asked ("what is the platform?"): the opening of the best passage.
      chosen = candidates.filter((candidate) => candidate.source === sources[0]!.n).slice(0, 2);
    } else {
      const best = Math.max(...candidates.map((candidate) => candidate.score));
      if (best === 0) return none;
      chosen = candidates
        .filter((candidate) => candidate.score >= best / 2)
        .sort((a, b) => b.score - a.score || a.source - b.source || a.position - b.position)
        .slice(0, MAX_SENTENCES);
    }
    chosen = this.withContext(chosen, candidates);

    const ordered = [...chosen].sort((a, b) => a.source - b.source || a.position - b.position);
    const lines: string[] = [];
    const quoted = new Set<string>();
    const used: Candidate[] = [];
    for (const candidate of ordered) {
      // The same sentence can stand in two articles; it is quoted once.
      if (quoted.has(candidate.text)) continue;
      const line = cite(candidate.text, candidate.source);
      if ([...lines, line].join(' ').length > MAX_CHARACTERS) break;
      lines.push(line);
      quoted.add(candidate.text);
      used.push(candidate);
    }
    const found = new Set(used.flatMap((candidate) => candidate.found));
    const coverage = terms.length === 0 ? 1 : found.size / terms.length;
    return {
      kind: 'answer',
      ...usage,
      answer: lines.join(' '),
      citations: [...new Set(used.map((candidate) => candidate.source))],
      confidence: coverage >= 0.75 ? 'high' : 'partial',
    };
  }

  /** Every sentence of every passage, scored by the question's stems it contains, rarer stems counting more. */
  private candidates(sources: readonly Source[], terms: readonly string[]): Candidate[] {
    const folded = sources.map((source) => fold(`${source.title}\n${source.text}`));
    const weight = new Map(
      terms.map((term) => {
        const containing = folded.filter((text) => hasStem(text, term)).length;
        return [term, Math.log(1 + sources.length / Math.max(1, containing))];
      }),
    );
    return sources.flatMap((source) =>
      passageSentences(source.text).map((sentence, position) => {
        const found = terms.filter((term) => hasStem(fold(sentence.text), term));
        return { ...sentence, source: source.n, position, found, score: found.reduce((sum, term) => sum + weight.get(term)!, 0) };
      }),
    );
  }

  /**
   * Adds what a chosen sentence cannot stand without: the sentence before one
   * that starts "They are…", and the list items that follow a sentence that
   * introduces them ("…goes through four steps.").
   */
  private withContext(chosen: Candidate[], all: readonly Candidate[]): Candidate[] {
    const result = [...chosen];
    const add = (candidate: Candidate | undefined) => {
      if (candidate && !result.includes(candidate)) result.push(candidate);
    };
    const at = (source: number, position: number) => all.find((other) => other.source === source && other.position === position);
    for (const candidate of chosen) {
      if (LEANS_BACK.test(candidate.text)) add(at(candidate.source, candidate.position - 1));
      if (!candidate.item) {
        for (let next = candidate.position + 1, count = 0; count < MAX_LIST_ITEMS; next++, count++) {
          const following = at(candidate.source, next);
          if (!following?.item) break;
          add(following);
        }
      }
    }
    return result;
  }
}
