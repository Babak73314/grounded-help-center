import { statusLabels, type Facts, type Locale, type StatusLabel } from './corpus';
import type { Source } from './retrieval';
import { containsTerm, detectLocale, fold, sentences } from './text';
import { capabilitiesIn, capabilityMentions, namesCapability, termsIn } from './vocabulary';

/**
 * The deterministic check every drafted answer passes before anyone reads it.
 * It does not ask a model whether the answer is good; it checks, in code,
 * the things that can be checked:
 *
 * - every sentence cites at least one of the passages it was given;
 * - every technology, capability and number a sentence names appears in the
 *   passages that sentence cites — an allow-list over facts, so a plausible
 *   invention fails however fluent it is;
 * - a status label next to a capability (LIVE, DEMO, LOCAL, OFF BY DEFAULT)
 *   is that capability's label in the delivery-status table;
 * - no e-mail address, telephone number, price or guarantee; no links or
 *   markup; the requested language; a sensible length.
 *
 * It cannot prove that an answer is true — a sentence can cite the right
 * passage and still misread it. It blocks the cheap failures when they match
 * the glossary and the rules, and says which rule broke, without echoing the
 * refused text into any log.
 */
export type GateRule =
  | 'empty'
  | 'length'
  | 'markup'
  | 'unknown-source'
  | 'uncited-sentence'
  | 'unsupported-term'
  | 'unsupported-capability'
  | 'unsupported-number'
  | 'status-mismatch'
  | 'contact-details'
  | 'price-or-guarantee'
  | 'language';

export interface GateFailure {
  rule: GateRule;
  /** What was unsupported (a term id, a number, `capability:LABEL`); never the refused sentence. */
  detail?: string;
}

export interface GateInput {
  answer: string;
  locale: Locale;
  sources: readonly Source[];
  facts: Facts;
}

const CITATION = /\[(\d{1,2})\]/g;
const MARKUP = /(<\/?[a-z!]|https?:\/\/|www\.|\]\(|\*\*|^#+\s|`)/im;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;
const PRICE_OR_GUARANTEE =
  /([$€£₺]\s?\d|\d\s?(usd|eur|gbp|try|tl)\b|\bper (month|year|user|seat)\b|\bfree trial\b|\bdiscount\w*|\bguarantee\w*|\bgaranti\w*|\baylik ucret\w*|\bindirim\w*|\bucretsiz deneme\w*)/;
const NUMBER = /(?<![\p{L}\p{N}.])\d+(?:[.,]\d+)*(?![\p{L}\p{N}])/gu;
const LABEL = new RegExp(`\\b(${[...statusLabels].sort((a, b) => b.length - a.length).join('|')})\\b`, 'g');

export const MAX_ANSWER_CHARACTERS = 1500;
const MAX_SENTENCES = 8;

/** A status label in a sentence must belong to the capability named nearest before it (or, failing that, after it). */
export function statusMismatches(claim: string, facts: Facts): GateFailure[] {
  const mentions = capabilityMentions(claim, facts);
  if (mentions.length === 0) return [];
  const failures: GateFailure[] = [];
  for (const match of claim.matchAll(LABEL)) {
    const label = match[1] as StatusLabel;
    const before = mentions.filter((mention) => mention.index < match.index).at(-1);
    const nearest = before ?? mentions.find((mention) => mention.index > match.index);
    const capability = nearest ? facts.capabilities.find((candidate) => candidate.id === nearest.id) : undefined;
    if (capability && !capability.labels.includes(label)) failures.push({ rule: 'status-mismatch', detail: `${capability.id}:${label}` });
  }
  return failures;
}

function hasPhoneNumber(text: string): boolean {
  return [...text.matchAll(PHONE)].some((match) => match[0].replace(/\D/g, '').length >= 9);
}

export function checkAnswer({ answer, locale, sources, facts }: GateInput): GateFailure[] {
  const failures: GateFailure[] = [];
  const add = (failure: GateFailure) => {
    if (!failures.some((existing) => existing.rule === failure.rule && existing.detail === failure.detail)) failures.push(failure);
  };
  const text = answer.trim();
  if (text.length === 0) return [{ rule: 'empty' }];
  if (text.length > MAX_ANSWER_CHARACTERS) add({ rule: 'length' });
  if (MARKUP.test(text)) add({ rule: 'markup' });

  const byNumber = new Map(sources.map((source) => [source.n, source]));
  const parts = sentences(text);
  if (parts.length > MAX_SENTENCES) add({ rule: 'length' });

  for (const sentence of parts) {
    const cited = [...sentence.matchAll(CITATION)].map((match) => Number(match[1]));
    if (cited.length === 0) {
      add({ rule: 'uncited-sentence' });
      continue;
    }
    for (const n of cited.filter((value) => !byNumber.has(value))) add({ rule: 'unknown-source', detail: String(n) });
    const citedText = cited
      .map((n) => byNumber.get(n))
      .filter((source): source is Source => source !== undefined)
      .map((source) => `${source.title}\n${source.text}`)
      .join('\n');
    const claim = sentence.replace(CITATION, ' ');

    for (const mention of termsIn(claim, facts)) {
      const term = facts.glossary.find((candidate) => candidate.id === mention.id)!;
      if (!term.aliases.some((alias) => containsTerm(citedText, alias))) add({ rule: 'unsupported-term', detail: term.id });
    }
    for (const mention of capabilitiesIn(claim, facts)) {
      const capability = facts.capabilities.find((candidate) => candidate.id === mention.id)!;
      if (!namesCapability(citedText, capability)) add({ rule: 'unsupported-capability', detail: capability.id });
    }
    for (const match of claim.matchAll(NUMBER)) {
      if (!containsTerm(citedText, match[0])) add({ rule: 'unsupported-number', detail: match[0] });
    }
    for (const failure of statusMismatches(claim, facts)) add(failure);
  }

  if (EMAIL.test(text) || hasPhoneNumber(text.replace(CITATION, ' '))) add({ rule: 'contact-details' });
  if (PRICE_OR_GUARANTEE.test(fold(text))) add({ rule: 'price-or-guarantee' });
  const language = detectLocale(text.replace(CITATION, ' '));
  if (language !== 'unknown' && language !== locale) add({ rule: 'language' });

  return failures;
}

/** What the model is told when its draft was refused: the rules it broke, never the refused text. */
export function feedbackFor(failures: readonly GateFailure[]): string[] {
  const messages: Record<GateRule, string> = {
    empty: 'The answer was empty.',
    length: `Keep the answer under ${MAX_ANSWER_CHARACTERS} characters and ${MAX_SENTENCES} sentences.`,
    markup: 'Do not include links, URLs, HTML or Markdown; the page shows the sources itself.',
    'unknown-source': 'Cite only the numbers of the sources you were given.',
    'uncited-sentence': 'Every sentence must end with the number of the source that supports it, like [2].',
    'unsupported-term': 'Name only technologies that appear in the sources a sentence cites.',
    'unsupported-capability': 'Name only applications and capabilities that appear in the sources a sentence cites.',
    'unsupported-number': 'Use only numbers, years and counts that appear in the sources a sentence cites.',
    'status-mismatch': 'Give each capability exactly the status label the sources give it.',
    'contact-details': 'Do not write e-mail addresses or telephone numbers.',
    'price-or-guarantee': 'Do not mention prices, fees, discounts or guarantees.',
    language: 'Answer in the language of the question.',
  };
  return [...new Set(failures.map((failure) => messages[failure.rule]))];
}
