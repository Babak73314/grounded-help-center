import { describe, expect, it } from 'vitest';
import { answerQuestion, statusAnswer, type AskDependencies } from '../src/answers';
import { checkAnswer } from '../src/gate';
import type { Source } from '../src/retrieval';
import { helpCorpus } from './corpus';
import { draftOf, ScriptedModel } from './scripted-model';

const corpus = helpCorpus();
const facts = corpus.facts;

function sourceFor(id: string, n = 1): Source {
  const chunk = corpus.chunks.find((candidate) => candidate.id === id)!;
  return { n, id: chunk.id, article: chunk.article, title: chunk.title, url: chunk.url, text: chunk.text };
}

const reservations = sourceFor('article:hotel-concierge:reservation-requests:en');

function deps(model: ScriptedModel, overrides: Partial<AskDependencies> = {}) {
  const calls = { retrieve: 0, reserved: 0, released: 0 };
  const dependencies: AskDependencies = {
    facts,
    retrieve: async () => {
      calls.retrieve += 1;
      return [reservations];
    },
    model,
    reserveDraft: async () => {
      calls.reserved += 1;
      return true;
    },
    releaseDraft: async () => {
      calls.released += 1;
    },
    ...overrides,
  };
  return { dependencies, calls };
}

describe('answering a question', () => {
  it('declines an out-of-scope question by code, without retrieval or a writer', async () => {
    const model = new ScriptedModel();
    const { dependencies, calls } = deps(model);
    const { answer } = await answerQuestion('How much does the platform cost?', 'en', dependencies);
    expect(answer.kind).toBe('out-of-scope');
    expect(answer.links).toEqual([{ label: 'All articles', url: '/en/' }]);
    expect(calls.retrieve).toBe(0);
    expect(model.requests).toHaveLength(0);
  });

  it('answers a status question by code from the status table, citing its row, in the asked language', async () => {
    const model = new ScriptedModel();
    const { dependencies, calls } = deps(model);
    const { answer } = await answerQuestion('Otel demosu yayında mı?', 'tr', dependencies);
    expect(answer.kind).toBe('status');
    expect(answer.text).toBe(
      'Otel demosu: DEMO, herkese açık Azure dağıtımı [1]. Kurgusal tesis, sentetik veri; canlı ses açık; mülk yönetim sistemi yok; müşteri yok [1].',
    );
    expect(answer.sources).toEqual([{ n: 1, label: 'Teslim durumu: genel bakış — Otel demosu', url: '/tr/articles/delivery-status/#hotel' }]);
    expect(answer.links).toEqual([{ label: 'Otel konsiyerji ve operasyonlar (DEMO)', url: '/tr/articles/hotel-concierge/' }]);
    expect(calls.retrieve).toBe(0);
    expect(model.requests).toHaveLength(0);
  });

  it('writes status answers that pass the same check as any draft', () => {
    for (const capability of facts.capabilities) {
      for (const locale of ['en', 'tr'] as const) {
        const answer = statusAnswer([capability.id], facts, locale);
        const row = corpus.chunks.find((chunk) => chunk.url === answer.sources[0]!.url)!;
        const failures = checkAnswer({ answer: answer.text, locale, sources: [{ ...sourceFor(row.id), n: 1 }], facts });
        expect(failures, `${capability.id}/${locale}`).toEqual([]);
      }
    }
  });

  it('refuses a question naming only technologies no article mentions, before retrieval', async () => {
    const model = new ScriptedModel();
    const { dependencies, calls } = deps(model);
    const { answer, telemetry } = await answerQuestion('Which Kubernetes version is required?', 'en', dependencies);
    expect(answer.kind).toBe('not-covered');
    expect(telemetry.notCovered).toBe('unknown-term');
    expect(calls.retrieve).toBe(0);
  });

  it('refuses below the evidence floor without calling the writer — whatever retrieval returned', async () => {
    const model = new ScriptedModel();
    const { dependencies, calls } = deps(model);
    const { answer, telemetry } = await answerQuestion('What is the weather in Istanbul today?', 'en', dependencies);
    expect(answer.kind).toBe('not-covered');
    expect(telemetry.notCovered).toBe('below-floor');
    expect(calls.retrieve).toBe(1);
    expect(calls.reserved).toBe(0);
    expect(model.requests).toHaveLength(0);
  });

  it('delivers a draft that passes the check, with the sources it cites', async () => {
    const model = new ScriptedModel([draftOf('Reservation requests are re-priced on the server [1]. They are requests, never bookings [1].')]);
    const { answer, telemetry } = await answerQuestion('Does the hotel concierge make bookings?', 'en', deps(model).dependencies);
    expect(answer.kind).toBe('grounded');
    expect(answer.writes).toBe('model');
    expect(answer.sources).toEqual([{ n: 1, label: reservations.title, url: reservations.url }]);
    expect(telemetry.attempts).toBe(1);
  });

  it('drafts once more with the broken rules named, and delivers the corrected answer', async () => {
    const model = new ScriptedModel([
      draftOf('The hotel concierge confirms bookings instantly [1]. Payment is guaranteed.'),
      draftOf('They are requests, never bookings [1].'),
    ]);
    const { answer, telemetry } = await answerQuestion('Does the hotel concierge make bookings?', 'en', deps(model).dependencies);
    expect(answer.kind).toBe('grounded');
    expect(model.requests[1]!.feedback?.length).toBeGreaterThan(0);
    expect(model.requests[1]!.feedback?.join(' ')).not.toContain('instantly');
    expect(telemetry.gateFailures).toContain('uncited-sentence');
  });

  it('withholds after two failed drafts and gives the articles instead — never the refused text', async () => {
    const model = new ScriptedModel([draftOf('Bookings are confirmed instantly.'), draftOf('Bookings are confirmed instantly.')]);
    const { answer } = await answerQuestion('Does the hotel concierge make bookings?', 'en', deps(model).dependencies);
    expect(answer.kind).toBe('withheld');
    expect(answer.text).not.toContain('instantly');
    expect(answer.links).toEqual([{ label: 'Hotel concierge and operations (DEMO)', url: '/en/articles/hotel-concierge/' }]);
  });

  it('says plainly when the writer finds no answer in the passages', async () => {
    const model = new ScriptedModel([draftOf('', 'none')]);
    const { answer, telemetry } = await answerQuestion('Does the hotel concierge make bookings?', 'en', deps(model).dependencies);
    expect(answer.kind).toBe('not-covered');
    expect(telemetry.notCovered).toBe('writer-declined');
  });

  it('withholds a refused draft without retrying it', async () => {
    const model = new ScriptedModel([{ kind: 'refused', writer: 'm', inputTokens: 10, outputTokens: 0 }]);
    const { answer } = await answerQuestion('Does the hotel concierge make bookings?', 'en', deps(model).dependencies);
    expect(answer.kind).toBe('withheld');
    expect(model.requests).toHaveLength(1);
  });

  it('asks once more for a malformed draft', async () => {
    const model = new ScriptedModel([{ kind: 'malformed', writer: 'm', inputTokens: 10, outputTokens: 5 }, draftOf('They are requests, never bookings [1].')]);
    const { answer } = await answerQuestion('Does the hotel concierge make bookings?', 'en', deps(model).dependencies);
    expect(answer.kind).toBe('grounded');
    expect(model.requests[1]!.feedback?.[0]).toMatch(/JSON object/);
  });

  it('gives the articles instead of a draft once today’s allowance is used up', async () => {
    const model = new ScriptedModel();
    const { answer } = await answerQuestion('Does the hotel concierge make bookings?', 'en', deps(model, { reserveDraft: async () => false }).dependencies);
    expect(answer.kind).toBe('busy');
    expect(model.requests).toHaveLength(0);
  });

  it('returns the allowance when the writer could not be reached', async () => {
    const model = new ScriptedModel();
    const { dependencies, calls } = deps(model);
    await expect(answerQuestion('Does the hotel concierge make bookings?', 'en', dependencies)).rejects.toThrow('No more scripted drafts.');
    expect(calls.released).toBe(1);
  });
});
