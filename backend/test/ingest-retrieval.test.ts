import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HashingEmbedder } from '../src/embeddings/hashing';
import { mapLimited, type Embedder } from '../src/embeddings/types';
import { ingest } from '../src/ingest';
import { keywordRanking, retrieve } from '../src/retrieval';
import { helpCorpus } from './corpus';
import { testDatabase, type TestDatabase } from './pglite';

let database: TestDatabase;
const embedder = new HashingEmbedder();
const count = async () => (await database.db.query<{ n: number }>('SELECT count(*)::int AS n FROM content_chunks'))[0]!.n;

beforeAll(async () => {
  database = await testDatabase();
});
afterAll(async () => database.close());

describe('ingestion', () => {
  it('loads every passage and the facts on the first run', async () => {
    const corpus = helpCorpus();
    const report = await ingest(database.db, corpus, embedder);
    expect(report).toMatchObject({ added: corpus.chunks.length, updated: 0, removed: 0, skipped: false, embedder: 'hashing-v1' });
    expect(await count()).toBe(corpus.chunks.length);
    const facts = await database.db.query<{ n: number }>("SELECT jsonb_array_length(facts->'capabilities') AS n FROM help_facts");
    expect(facts[0]?.n).toBe(corpus.facts.capabilities.length);
  });

  it('does nothing — and embeds nothing — when the articles have not changed', async () => {
    const before = embedder.calls;
    expect((await ingest(database.db, helpCorpus(), embedder)).skipped).toBe(true);
    expect(embedder.calls).toBe(before);
  });

  it('embeds only the changed passage, and removes passages no longer published', async () => {
    const corpus = structuredClone(helpCorpus());
    corpus.chunks[0]!.text += ' One more sentence.';
    const gone = corpus.chunks.pop()!;
    const before = embedder.calls;
    const report = await ingest(database.db, corpus, embedder);
    expect(report).toMatchObject({ added: 0, updated: 1, removed: 1, skipped: false });
    expect(embedder.calls - before).toBe(1);
    expect(await database.db.query('SELECT 1 FROM content_chunks WHERE id = :id', { id: gone.id })).toEqual([]);
    await ingest(database.db, helpCorpus(), embedder); // restore
  });

  it('embeds every passage again when the embedder changes', async () => {
    const other: Embedder = { id: 'another-embedder', dimensions: 1024, embed: (text) => embedder.embed(text) };
    const report = await ingest(database.db, helpCorpus(), other);
    expect(report.updated).toBe(helpCorpus().chunks.length);
    await ingest(database.db, helpCorpus(), embedder); // restore
  });

  it('refuses a malformed corpus and leaves the database as it was', async () => {
    await expect(ingest(database.db, { version: 1, facts: {}, chunks: [] }, embedder)).rejects.toThrow(/expected shape/);
    expect(await count()).toBe(helpCorpus().chunks.length);
  });

  it('keeps the previous version when an embedding fails halfway', async () => {
    const corpus = structuredClone(helpCorpus());
    for (const chunk of corpus.chunks.slice(0, 5)) chunk.text += ' Changed.';
    let calls = 0;
    const failing: Embedder = {
      id: embedder.id,
      dimensions: 1024,
      embed: async (text) => {
        if (++calls === 3) throw new Error('throttled');
        return embedder.embed(text);
      },
    };
    await expect(ingest(database.db, corpus, failing, 1)).rejects.toThrow('throttled');
    const rows = await database.db.query<{ body: string }>('SELECT body FROM content_chunks WHERE id = :id', { id: corpus.chunks[0]!.id });
    expect(rows[0]?.body.endsWith(' Changed.')).toBe(false);
  });
});

describe('hybrid retrieval', () => {
  it('finds the sections about what was asked, in the asked language only, numbered for citing', async () => {
    const sources = await retrieve(database.db, embedder, 'Does the hotel concierge make bookings?', 'en');
    expect(sources.every((source) => source.url.startsWith('/en/'))).toBe(true);
    expect(sources.slice(0, 3).map((source) => source.id)).toContain('article:hotel-concierge:reservation-requests:en');
    expect(sources.map((source) => source.n)).toEqual(sources.map((_, index) => index + 1));
  });

  it('finds Turkish sections when the question uses other endings, or no Turkish letters', async () => {
    const sources = await retrieve(database.db, embedder, 'muhasebe defterinin yasam dongusu', 'tr');
    expect(sources.slice(0, 3).some((source) => source.article === 'accounting')).toBe(true);
  });

  it('weights a section title above its body', async () => {
    const [first] = await retrieve(database.db, embedder, 'Technology stack', 'en');
    expect(first?.article).toBe('technology-stack');
  });

  it('still returns the nearest passages when no word is searchable — the evidence floor decides what to do with them', async () => {
    expect((await retrieve(database.db, embedder, 'the and of', 'en')).length).toBeGreaterThan(0);
  });

  it('stays within the character budget given to the writer', async () => {
    const sources = await retrieve(database.db, embedder, 'Azure OpenAI retrieval', 'en', { limit: 10, maxCharacters: 600 });
    const total = sources.reduce((sum, source) => sum + source.text.length, 0);
    expect(sources.length === 1 || total <= 600).toBe(true);
  });

  it('lets a word few passages use outweigh one that many passages repeat', async () => {
    const own = await testDatabase();
    try {
      const part = (n: number, text: string) => ({ id: `article:notes:part-${n}:en`, locale: 'en' as const, article: 'notes', url: `/en/articles/notes/#part-${n}`, title: `Part ${n}`, text });
      const corpus = { ...helpCorpus(), chunks: [part(1, 'A test, then another test.'), part(2, 'One test and a second test.'), part(3, 'The test passed the test.'), part(4, 'An audit.')] };
      await ingest(own.db, corpus, embedder);
      // Unweighted, the three passages that say "test" twice would come first; "audit" is in one passage only.
      expect((await keywordRanking(own.db, 'audit test', 'en'))[0]).toBe('article:notes:part-4:en');
    } finally {
      await own.close();
    }
  });

  it('does not search the words every article uses', async () => {
    expect(await keywordRanking(database.db, 'What is the platform?', 'en')).toEqual([]);
    expect(await keywordRanking(database.db, 'platform security', 'en')).toEqual(await keywordRanking(database.db, 'security', 'en'));
  });

  it('cannot be steered into SQL by the question', async () => {
    const sources = await retrieve(database.db, embedder, "x') OR 1=1; DROP TABLE content_chunks; --", 'en');
    expect(Array.isArray(sources)).toBe(true);
    expect(await count()).toBe(helpCorpus().chunks.length);
  });
});

describe('bounded concurrency', () => {
  it('keeps order and never exceeds the limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const result = await mapLimited([5, 1, 4, 2, 3], 2, async (value) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, value));
      inFlight -= 1;
      return value * 10;
    });
    expect(result).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
  });
});
