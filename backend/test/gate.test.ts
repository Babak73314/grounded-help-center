import { describe, expect, it } from 'vitest';
import { checkAnswer, feedbackFor, statusMismatches } from '../src/gate';
import type { Source } from '../src/retrieval';
import { detectLocale } from '../src/text';
import { helpCorpus } from './corpus';
import { synthetic } from '../../tests/unit/synthetic';

const corpus = helpCorpus();
const facts = corpus.facts;

/** A real section of a real article, as retrieval would hand it over. */
function sourceFor(id: string, n = 1): Source {
  const chunk = corpus.chunks.find((candidate) => candidate.id === id);
  if (!chunk) throw new Error(`No chunk ${id}`);
  return { n, id: chunk.id, article: chunk.article, title: chunk.title, url: chunk.url, text: chunk.text };
}

const sources = [sourceFor('article:hotel-concierge:reservation-requests:en', 1), sourceFor('article:accounting:status:en', 2)];
const rules = (answer: string, locale: 'en' | 'tr' = 'en') => checkAnswer({ answer, locale, sources, facts }).map((failure) => failure.rule);

describe('the answer check', () => {
  it('passes an answer whose every sentence cites a passage that states it', () => {
    expect(rules('Reservation requests are processed through a staff queue [1]. They are requests, never bookings [1]. Finance and accounting is LOCAL [2].')).toEqual([]);
  });

  it('refuses a sentence with no citation, and a citation to a passage it was not given', () => {
    expect(rules('Reservation requests are re-priced on the server [1]. Bookings are confirmed at once.')).toContain('uncited-sentence');
    expect(rules('Reservation requests are re-priced on the server [7].')).toContain('unknown-source');
  });

  it('refuses a technology the cited passage does not name — even one another article names', () => {
    expect(checkAnswer({ answer: 'Reservation requests are stored in Azure SQL [1].', locale: 'en', sources, facts })).toContainEqual({
      rule: 'unsupported-term',
      detail: 'azure-sql',
    });
    expect(rules('Reservation requests run on Kubernetes [1].')).toContain('unsupported-term');
  });

  it('refuses a capability the cited passage does not name', () => {
    expect(rules('The commerce storefront re-prices requests on the server [1].')).toContain('unsupported-capability');
  });

  it('refuses a number the cited passage does not state', () => {
    expect(rules('Reservation requests are re-priced within 5 seconds [1].')).toContain('unsupported-number');
    expect(rules('Its gated SQL Server suite of 165 finance tests runs in CI [2].')).toEqual([]);
  });

  it('refuses a status label that is not the capability’s own', () => {
    expect(checkAnswer({ answer: 'Finance and accounting is LIVE [2].', locale: 'en', sources, facts })).toContainEqual({
      rule: 'status-mismatch',
      detail: 'accounting:LIVE',
    });
    expect(rules('The hotel demo is LOCAL [1].')).toContain('status-mismatch');
  });

  it('pairs each label with the capability named nearest before it', () => {
    expect(statusMismatches('The sales website is LIVE and the hotel demo is DEMO.', facts)).toEqual([]);
    expect(statusMismatches('The sales website is DEMO and the hotel demo is LIVE.', facts).map((failure) => failure.detail)).toEqual([
      'sales-website:DEMO',
      'hotel:LIVE',
    ]);
    expect(statusMismatches('Live voice is OFF BY DEFAULT and on in the hotel demo.', facts)).toEqual([]);
  });

  it('refuses contact details, prices, guarantees, links, markup and the wrong language', () => {
    expect(rules(`Write to ${synthetic.email()} about reservation requests [1].`)).toContain('contact-details');
    expect(rules(`Call ${synthetic.phone()} about reservation requests [1].`)).toContain('contact-details');
    expect(rules('Reservation requests cost $20 per month [1].')).toContain('price-or-guarantee');
    expect(rules('Reservation requests are guaranteed [1].')).toContain('price-or-guarantee');
    expect(rules(`See ${synthetic.url()} about reservation requests [1].`)).toContain('markup');
    expect(rules('**Reservation requests** are re-priced on the server [1].')).toContain('markup');
    expect(rules('Rezervasyon talepleri sunucuda yeniden fiyatlandırılır ve bir personel kuyruğu üzerinden işlenir [1].')).toContain('language');
  });

  it('turns failures into rules for the second draft, never into the refused text', () => {
    const feedback = feedbackFor(checkAnswer({ answer: 'Finance and accounting is LIVE on Kubernetes [2]. Nice.', locale: 'en', sources, facts }));
    expect(feedback.join(' ')).not.toMatch(/Kubernetes|Nice/);
    expect(feedback.length).toBeGreaterThanOrEqual(3);
  });
});

describe('the articles, against the same rules', () => {
  it('never contradict the status table: every sentence with a label gives the right capability the right label', () => {
    for (const chunk of corpus.chunks) {
      for (const line of chunk.text.split('\n')) expect(statusMismatches(line, facts), `${chunk.id}: ${line}`).toEqual([]);
    }
  });

  it('are written in the language they are published in', () => {
    for (const chunk of corpus.chunks) {
      for (const line of chunk.text.split('\n')) {
        const language = detectLocale(line);
        expect(language === 'unknown' || language === chunk.locale, `${chunk.id}: ${line}`).toBe(true);
      }
    }
  });

  it('carry no contact details, prices or links: a quotation of any sentence passes those rules', () => {
    for (const chunk of corpus.chunks) {
      const failures = checkAnswer({ answer: `${chunk.text.replace(/\n/g, ' ')} [1].`, locale: chunk.locale, sources: [{ ...sourceFor(chunk.id) }], facts })
        .map((failure) => failure.rule)
        .filter((rule) => ['contact-details', 'price-or-guarantee', 'markup'].includes(rule));
      expect(failures, chunk.id).toEqual([]);
    }
  });
});
