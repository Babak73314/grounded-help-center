import { chunkHash, corpusSchema, sha256, type Corpus } from './corpus';
import { vectorLiteral, type SqlClient } from './db/sql';
import { mapLimited, type Embedder } from './embeddings/types';
import { fold } from './text';

export interface IngestReport {
  corpusHash: string;
  embedder: string;
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
  skipped: boolean;
}

/**
 * Loads the published help center into the database. Only passages whose
 * text changed — or that were embedded by another embedder — are embedded
 * again; passages no longer published are deleted; the structured facts are
 * replaced. The writes happen in one transaction, after every embedding has
 * succeeded, so a failed run leaves the previous version intact rather than
 * half of each.
 */
export async function ingest(db: SqlClient, input: unknown, embedder: Embedder, concurrency = 4): Promise<IngestReport> {
  const parsed = corpusSchema.safeParse(input);
  if (!parsed.success) throw new Error(`The corpus does not match the expected shape: ${parsed.error.issues.slice(0, 3).map((issue) => issue.message).join('; ')}`);
  const corpus: Corpus = parsed.data;
  const corpusHash = sha256(JSON.stringify(corpus));

  const current = await db.query<{ corpus_hash: string }>('SELECT corpus_hash FROM help_facts WHERE id = 1');
  const existing = await db.query<{ id: string; content_hash: string }>('SELECT id, content_hash FROM content_chunks');
  const existingById = new Map(existing.map((row) => [row.id, row.content_hash]));
  const published = new Set(corpus.chunks.map((chunk) => chunk.id));

  const changed = corpus.chunks.filter((chunk) => existingById.get(chunk.id) !== chunkHash(chunk, embedder.id));
  const removed = existing.filter((row) => !published.has(row.id)).map((row) => row.id);
  const report: IngestReport = {
    corpusHash,
    embedder: embedder.id,
    added: changed.filter((chunk) => !existingById.has(chunk.id)).length,
    updated: changed.filter((chunk) => existingById.has(chunk.id)).length,
    removed: removed.length,
    unchanged: corpus.chunks.length - changed.length,
    skipped: false,
  };
  if (current[0]?.corpus_hash === corpusHash && changed.length === 0 && removed.length === 0) {
    return { ...report, skipped: true };
  }

  const embeddings = await mapLimited(changed, concurrency, (chunk) => embedder.embed(`${chunk.title}\n${chunk.text}`));

  await db.transaction(async (tx) => {
    for (const [index, chunk] of changed.entries()) {
      await tx.query(
        `INSERT INTO content_chunks (id, locale, article, url, title, body, search_title, search_body, content_hash, embedder, embedding, updated_at)
         VALUES (:id, :locale, :article, :url, :title, :body, :search_title, :search_body, :hash, :embedder, CAST(:embedding AS vector), now())
         ON CONFLICT (id) DO UPDATE SET
           locale = EXCLUDED.locale, article = EXCLUDED.article, url = EXCLUDED.url, title = EXCLUDED.title,
           body = EXCLUDED.body, search_title = EXCLUDED.search_title, search_body = EXCLUDED.search_body,
           content_hash = EXCLUDED.content_hash, embedder = EXCLUDED.embedder, embedding = EXCLUDED.embedding, updated_at = now()`,
        {
          id: chunk.id,
          locale: chunk.locale,
          article: chunk.article,
          url: chunk.url,
          title: chunk.title,
          body: chunk.text,
          search_title: fold(chunk.title),
          search_body: fold(chunk.text),
          hash: chunkHash(chunk, embedder.id),
          embedder: embedder.id,
          embedding: vectorLiteral(embeddings[index]!),
        },
      );
    }
    for (const id of removed) await tx.query('DELETE FROM content_chunks WHERE id = :id', { id });
    await tx.query(
      `INSERT INTO help_facts (id, corpus_hash, facts, updated_at)
       VALUES (1, :hash, CAST(:facts AS jsonb), now())
       ON CONFLICT (id) DO UPDATE SET corpus_hash = EXCLUDED.corpus_hash, facts = EXCLUDED.facts, updated_at = now()`,
      { hash: corpusHash, facts: JSON.stringify(corpus.facts) },
    );
  });
  return report;
}
