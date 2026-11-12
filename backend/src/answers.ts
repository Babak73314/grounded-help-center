import type { Facts, Locale } from './corpus';
import { evidenceFor, meetsFloor, namesOnlyAbsentTerms } from './evidence';
import { checkAnswer, feedbackFor } from './gate';
import type { AnswerModel } from './models/types';
import type { Source } from './retrieval';
import { route, type OutOfScopeTopic, type Route } from './router';

export interface AskLink {
  label: string;
  url: string;
}

export interface AskSource extends AskLink {
  n: number;
}

/**
 * What a visitor gets. `text` is plain text with `[n]` markers that refer to
 * `sources`. Nothing in it is ever rendered as HTML by the page.
 *
 * - `status`: written by code from the delivery-status table;
 * - `grounded`: drafted from retrieved passages and passed by the answer check;
 * - `out-of-scope`, `not-covered`: a refusal — the help center has no answer;
 * - `withheld`: a draft failed the check twice; the relevant articles instead;
 * - `busy`: today's drafting allowance is used up.
 */
export interface AskAnswer {
  kind: 'status' | 'grounded' | 'out-of-scope' | 'not-covered' | 'withheld' | 'busy';
  /** For a grounded answer: quoted from the articles by code, or written by a language model. */
  writes?: 'quote' | 'model';
  text: string;
  sources: AskSource[];
  links: AskLink[];
}

/** Why a question was not covered — for telemetry and the evaluation, never shown. */
export type NotCoveredReason = 'unknown-term' | 'no-passages' | 'below-floor' | 'writer-declined';

export interface AskTelemetry {
  route: Route['kind'];
  outcome: AskAnswer['kind'];
  writer: string | null;
  attempts: number;
  inputTokens: number;
  outputTokens: number;
  gateFailures: string[];
  notCovered?: NotCoveredReason;
  evidence?: number;
}

export interface AskDependencies {
  facts: Facts;
  retrieve: (question: string, locale: Locale) => Promise<Source[]>;
  model: AnswerModel;
  /** Takes one draft from today's allowance; false when it is used up. */
  reserveDraft: () => Promise<boolean>;
  /** Gives the reservation back when no draft was written. */
  releaseDraft: () => Promise<void>;
}

const MAX_ATTEMPTS = 2;

type Words = Record<Locale, string>;
const t = (words: Words, locale: Locale, values: Record<string, string | number> = {}): string =>
  words[locale].replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

const TEXT = {
  status: { en: '{name}: {state} [{n}]. {meaning} [{n}].', tr: '{name}: {state} [{n}]. {meaning} [{n}].' },
  allArticles: { en: 'All articles', tr: 'Tüm makaleler' },
  pricing: {
    en: 'The help center does not cover prices or pricing. It answers only from its articles about the platform.',
    tr: 'Yardım merkezi fiyat veya fiyatlandırma bilgisi içermiyor. Yalnızca platformu anlatan makalelerinden yanıt verir.',
  },
  contact: {
    en: 'The help center lists no support channel, telephone number or e-mail address. It answers only from its articles about the platform.',
    tr: 'Yardım merkezinde destek kanalı, telefon numarası veya e-posta adresi yer almıyor. Yalnızca platformu anlatan makalelerinden yanıt verir.',
  },
  account: {
    en: 'The help center does not describe account actions such as signing up or resetting a password. It answers only from its articles about the platform.',
    tr: 'Yardım merkezi kayıt olma veya şifre sıfırlama gibi hesap işlemlerini anlatmıyor. Yalnızca platformu anlatan makalelerinden yanıt verir.',
  },
  roadmap: {
    en: 'The help center does not cover release dates or plans for future versions. It answers only from its articles about the platform.',
    tr: 'Yardım merkezi yayım tarihlerini veya gelecek sürüm planlarını içermiyor. Yalnızca platformu anlatan makalelerinden yanıt verir.',
  },
  notCovered: {
    en: 'The help center does not cover that. Its articles describe the platform only as far as its architecture overview does.',
    tr: 'Yardım merkezi bu konuyu kapsamıyor. Makaleleri, platformu yalnızca mimari genel bakışta yer alan bilgiler ölçüsünde açıklar.',
  },
  withheld: {
    en: 'No answer could be written that passes the check against the articles, so here are the most relevant articles instead.',
    tr: 'Makalelerle yapılan denetimden geçen bir yanıt yazılamadı; bunun yerine en ilgili makaleler aşağıda.',
  },
  busy: {
    en: 'The assistant has drafted as many answers as it may today. Here are the most relevant articles.',
    tr: 'Asistan bugünkü yanıt sınırına ulaştı. En ilgili makaleler aşağıda.',
  },
} satisfies Record<string, Words>;

const OUT_OF_SCOPE_TEXT: Record<OutOfScopeTopic, Words> = {
  pricing: TEXT.pricing,
  contact: TEXT.contact,
  account: TEXT.account,
  roadmap: TEXT.roadmap,
};

/** The articles the passages come from, one link each, best first. */
function articleLinks(sources: readonly Source[], count = 3): AskLink[] {
  const seen = new Set<string>();
  const links: AskLink[] = [];
  for (const source of sources) {
    const page = source.url.split('#')[0]!;
    if (seen.has(page)) continue;
    seen.add(page);
    links.push({ label: source.title.split(' — ')[0]!, url: page });
    if (links.length === count) break;
  }
  return links;
}

function homeLink(facts: Facts, locale: Locale): AskLink {
  return { label: t(TEXT.allArticles, locale), url: facts.home[locale] };
}

/** The status of named capabilities, written by code from the delivery-status table, each sentence citing its row. */
export function statusAnswer(capabilityIds: readonly string[], facts: Facts, locale: Locale): AskAnswer {
  const sources: AskSource[] = [];
  const sentences: string[] = [];
  const links: AskLink[] = [];
  for (const id of capabilityIds) {
    const capability = facts.capabilities.find((candidate) => candidate.id === id);
    if (!capability) continue;
    const n = sources.length + 1;
    sources.push({ n, label: capability.source.title[locale], url: capability.source.url[locale] });
    sentences.push(
      t(TEXT.status, locale, { name: capability.name[locale], state: capability.state[locale], meaning: capability.meaning[locale].replace(/[.]$/, ''), n }),
    );
    if (capability.article) links.push({ label: capability.article.title[locale], url: capability.article.url[locale] });
  }
  return { kind: 'status', text: sentences.join(' '), sources, links };
}

function citedSources(text: string, sources: readonly Source[]): AskSource[] {
  const cited = new Set([...text.matchAll(/\[(\d{1,2})\]/g)].map((match) => Number(match[1])));
  return sources.filter((source) => cited.has(source.n)).map((source) => ({ n: source.n, label: source.title, url: source.url }));
}

/**
 * Answers one question. Out-of-scope and status questions never reach
 * retrieval. A grounded answer needs evidence first — the question's own
 * words in the retrieved passages — and without it the writer is never
 * called. A draft is checked, drafted once more with the broken rules named
 * if it fails, and then withheld: the visitor gets the relevant articles
 * instead of an answer nobody could check.
 */
export async function answerQuestion(
  question: string,
  locale: Locale,
  deps: AskDependencies,
): Promise<{ answer: AskAnswer; telemetry: AskTelemetry }> {
  const chosen = route(question, deps.facts);
  const telemetry: AskTelemetry = {
    route: chosen.kind,
    outcome: 'not-covered',
    writer: null,
    attempts: 0,
    inputTokens: 0,
    outputTokens: 0,
    gateFailures: [],
  };
  const done = (answer: AskAnswer, extra: Partial<AskTelemetry> = {}) => ({ answer, telemetry: { ...telemetry, ...extra, outcome: answer.kind } });
  const notCovered = (reason: NotCoveredReason) =>
    done({ kind: 'not-covered', text: t(TEXT.notCovered, locale), sources: [], links: [homeLink(deps.facts, locale)] }, { notCovered: reason });

  if (chosen.kind === 'out-of-scope') {
    return done({ kind: 'out-of-scope', text: t(OUT_OF_SCOPE_TEXT[chosen.topic], locale), sources: [], links: [homeLink(deps.facts, locale)] });
  }
  if (chosen.kind === 'status') return done(statusAnswer(chosen.capabilities, deps.facts, locale));

  if (namesOnlyAbsentTerms(question, deps.facts)) return notCovered('unknown-term');
  const sources = await deps.retrieve(question, locale);
  if (sources.length === 0) return notCovered('no-passages');
  const evidence = evidenceFor(question, sources);
  telemetry.evidence = Number(evidence.ratio.toFixed(2));
  if (!meetsFloor(evidence)) return notCovered('below-floor');

  if (!(await deps.reserveDraft())) {
    return done({ kind: 'busy', text: t(TEXT.busy, locale), sources: [], links: articleLinks(sources) });
  }

  let feedback: string[] | undefined;
  let wrote = false;
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const draft = await deps.model.draft({ question, locale, sources, feedback });
      wrote = true;
      telemetry.attempts = attempt;
      telemetry.writer = draft.writer;
      telemetry.inputTokens += draft.inputTokens;
      telemetry.outputTokens += draft.outputTokens;

      if (draft.kind === 'refused') {
        telemetry.gateFailures.push('refused');
        break;
      }
      if (draft.kind === 'malformed') {
        telemetry.gateFailures.push('malformed');
        feedback = ['Reply with the JSON object only, with the fields answer, citations and confidence.'];
        continue;
      }
      if (draft.confidence === 'none') return notCovered('writer-declined');
      const failures = checkAnswer({ answer: draft.answer, locale, sources, facts: deps.facts });
      if (failures.length === 0) {
        const text = draft.answer.trim();
        return done({ kind: 'grounded', writes: deps.model.writes, text, sources: citedSources(text, sources), links: [] });
      }
      telemetry.gateFailures.push(...failures.map((failure) => (failure.detail ? `${failure.rule}:${failure.detail}` : failure.rule)));
      feedback = feedbackFor(failures);
    }
  } catch (error) {
    if (!wrote) await deps.releaseDraft();
    throw error;
  }
  return done({ kind: 'withheld', text: t(TEXT.withheld, locale), sources: [], links: articleLinks(sources) });
}
