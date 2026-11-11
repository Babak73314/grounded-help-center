import { describe, expect, it } from 'vitest';
import { corpusSchema } from '../src/corpus';
import { evidenceFor, meetsFloor, namesOnlyAbsentTerms, salientStems } from '../src/evidence';
import type { Source } from '../src/retrieval';
import { route } from '../src/router';
import { containsTerm, detectLocale, fold, prefixQuery, sentences, stem } from '../src/text';
import { capabilitiesIn, foldedWithoutCapabilityNames, termsIn } from '../src/vocabulary';
import { helpCorpus } from './corpus';

const facts = helpCorpus().facts;

describe('the corpus the site publishes', () => {
  it('matches the schema the backend expects', () => {
    expect(corpusSchema.safeParse(helpCorpus()).success).toBe(true);
  });

  it('has every section in both languages, at the same anchor', () => {
    const chunks = helpCorpus().chunks;
    const en = chunks.filter((chunk) => chunk.locale === 'en').map((chunk) => chunk.url.replace('/en/', '/'));
    const tr = chunks.filter((chunk) => chunk.locale === 'tr').map((chunk) => chunk.url.replace('/tr/', '/'));
    expect(en).toEqual(tr);
    expect(chunks.length).toBeGreaterThan(100);
  });

  it('marks which technologies the articles mention, and which they never do', () => {
    const present = (id: string) => facts.glossary.find((term) => term.id === id)?.present;
    expect(present('blazor')).toBe(true);
    expect(present('azure-ai-search')).toBe(true);
    expect(present('kubernetes')).toBe(false);
    expect(present('amazon-bedrock')).toBe(false);
  });

  it('is refused whole when malformed', () => {
    const broken = structuredClone(helpCorpus()) as { chunks: Array<{ id: string }> };
    broken.chunks[1]!.id = broken.chunks[0]!.id;
    expect(corpusSchema.safeParse(broken).success).toBe(false);
    expect(corpusSchema.safeParse({ version: 2, facts, chunks: [] }).success).toBe(false);
  });
});

describe('text helpers', () => {
  it('fold Turkish letters and accents', () => {
    expect(fold('Çözüm İstanbul ığdır')).toBe('cozum istanbul igdir');
  });

  it('match words by their stems, so endings in either language still match', () => {
    expect(stem('deployed')).toBe('deploy');
    expect(stem(fold('çözümde'))).toBe('cozum');
    expect(stem('key')).toBe('key');
    expect(prefixQuery('Is the hotel demo deployed?')).toBe('hote:* | demo:* | deploy:*');
  });

  it('build a full-text query no visitor can turn into tsquery syntax', () => {
    expect(prefixQuery("x') | !y & z:* <-> w")).toBe('');
    expect(prefixQuery('the and of')).toBe('');
    expect(prefixQuery("rates' OR 1=1 --")).toMatch(/^[a-z0-9:* |]+$/);
  });

  it('match whole terms only, accents and case ignored', () => {
    expect(containsTerm('Built on Azure OpenAI', 'azure openai')).toBe(true);
    expect(containsTerm('JavaScript client', 'Java')).toBe(false);
    expect(containsTerm('ASP.NET Core', '.NET')).toBe(false);
    expect(containsTerm('.NET 10 runtime', '.NET')).toBe(true);
    expect(containsTerm('Key Vault’ta tutulur', 'Key Vault')).toBe(true);
  });

  it('never lets a short cited sentence carry an uncited one', () => {
    expect(sentences('It is LIVE [1]. It is also certified.')).toEqual(['It is LIVE [1].', 'It is also certified.']);
  });

  it('tell English from Turkish', () => {
    expect(detectLocale('The ledger runs with no AI in it.')).toBe('en');
    expect(detectLocale('Muhasebe defteri içinde hiç yapay zekâ olmadan çalışır.')).toBe('tr');
    expect(detectLocale('Azure OpenAI')).toBe('unknown');
    expect(detectLocale('Commercial site: LIVE.')).not.toBe('tr');
  });
});

describe('vocabulary', () => {
  it('keeps the longest of overlapping names', () => {
    expect(termsIn('It uses Azure OpenAI Realtime and Azure AI Search.', facts).map((mention) => mention.id)).toEqual(['azure-openai-realtime', 'azure-ai-search']);
  });

  it('finds capabilities by any of their names, in either language', () => {
    expect(capabilitiesIn('Is the hotel demo live?', facts).map((mention) => mention.id)).toEqual(['hotel']);
    expect(capabilitiesIn('Muhasebe uygulaması yayına alındı mı?', facts).map((mention) => mention.id)).toEqual(['accounting']);
    expect(capabilitiesIn('Is live voice on?', facts).map((mention) => mention.id)).toEqual(['live-voice']);
  });

  it('blanks capability names out, so "live voice" does not read as "is it live?"', () => {
    expect(foldedWithoutCapabilityNames('Does live voice work?', facts)).not.toContain('live');
  });
});

describe('routing', () => {
  it('declines prices, support channels, account actions and release plans by code, in both languages', () => {
    expect(route('How much does the platform cost?', facts)).toEqual({ kind: 'out-of-scope', topic: 'pricing' });
    expect(route('Platformun fiyatı nedir?', facts)).toEqual({ kind: 'out-of-scope', topic: 'pricing' });
    expect(route('What is the support e-mail address?', facts)).toEqual({ kind: 'out-of-scope', topic: 'contact' });
    expect(route('Destek telefon numarası nedir?', facts)).toEqual({ kind: 'out-of-scope', topic: 'contact' });
    expect(route('How do I reset my password?', facts)).toEqual({ kind: 'out-of-scope', topic: 'account' });
    expect(route('Şifremi nasıl sıfırlarım?', facts)).toEqual({ kind: 'out-of-scope', topic: 'account' });
    expect(route('When is the next version released?', facts)).toEqual({ kind: 'out-of-scope', topic: 'roadmap' });
    expect(route('Bir sonraki sürüm ne zaman yayımlanacak?', facts)).toEqual({ kind: 'out-of-scope', topic: 'roadmap' });
  });

  it('answers "is it live / deployed / a demo?" from the status table', () => {
    expect(route('Is the sales website live?', facts)).toEqual({ kind: 'status', capabilities: ['sales-website'] });
    expect(route('Is the accounting application deployed?', facts)).toEqual({ kind: 'status', capabilities: ['accounting'] });
    expect(route('Satış web sitesi yayında mı?', facts)).toEqual({ kind: 'status', capabilities: ['sales-website'] });
    expect(route('Is live voice on by default?', facts)).toEqual({ kind: 'status', capabilities: ['live-voice'] });
  });

  it('sends explanations and everything else to retrieval', () => {
    expect(route('How is the hotel demo deployed?', facts).kind).toBe('grounded');
    expect(route('Does the hotel concierge make bookings?', facts).kind).toBe('grounded');
    expect(route('Where do hotel prices come from?', facts).kind).toBe('grounded');
    expect(route('Does live voice use WebRTC?', facts).kind).toBe('grounded');
    expect(route('Does the admin agent track token and cost accounting?', facts).kind).toBe('grounded');
  });
});

describe('the evidence floor', () => {
  const source = (text: string, title = 'An article — A section'): Source => ({ n: 1, id: 'x', article: 'x', title, url: '/en/articles/x/', text });

  it('keeps the words that carry the question, not the generic ones', () => {
    expect(salientStems('What is the platform?')).toEqual([]);
    expect(salientStems('Which Kubernetes version does the platform require?')).toEqual(['kubern', 'versi', 'requi']);
  });

  it('passes when the passages contain most of the question, and fails when they do not', () => {
    const passages = [source('Model keys never reach a browser.')];
    expect(meetsFloor(evidenceFor('Can a model key reach the browser?', passages))).toBe(true);
    expect(meetsFloor(evidenceFor('What is the weather in Istanbul today?', passages))).toBe(false);
  });

  it('lets a question of only generic words through to the best passage', () => {
    expect(meetsFloor(evidenceFor('What is the platform?', [source('Anything.')]))).toBe(true);
  });

  it('recognises a question that names only technologies no article mentions', () => {
    expect(namesOnlyAbsentTerms('Which Kubernetes version does it need?', facts)).toBe(true);
    expect(namesOnlyAbsentTerms('Does it use Kubernetes or Azure?', facts)).toBe(false);
    expect(namesOnlyAbsentTerms('How does retrieval work?', facts)).toBe(false);
  });
});
