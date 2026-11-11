import type { Locale } from './corpus';
import { vectorLiteral, type SqlClient } from './db/sql';
import type { Embedder } from './embeddings/types';
import { prefixQuery } from './text';

/** A passage given to the writer, numbered as the answer must cite it. */
export interface Source {
  n: number;
  id: string;
  article: string;
  title: string;
  url: string;
  text: string;
}

/** Reciprocal-rank-fusion constant: how much the first places outweigh the rest. 60 is the usual choice. */
const RRF_K = 60;

/**
 * Hybrid search inside PostgreSQL: pgvector (cosine distance on the
 * question's embedding) finds passages that mean the same thing; full-text
 * search finds passages that use the same words — a product name, an
 * acronym, a year — which embeddings are known to blur. The keyword half
 * matches word stems as prefixes, so Turkish and English endings still match
 * ("çözümde" finds "çözüm"), and weights a match in a section title above one
 * in its body. The two rankings are fused by reciprocal rank, so neither
 * score scale has to be calibrated against the other.
 */
export async function retrieve(
  db: SqlClient,
  embedder: Embedder,
  question: string,
  locale: Locale,
  options: { limit?: number; candidates?: number; maxCharacters?: number } = {},
): Promise<Source[]> {
  const limit = options.limit ?? 6;
  const candidates = options.candidates ?? 20;
  const maxCharacters = options.maxCharacters ?? 12_000;
  const embedding = vectorLiteral(await embedder.embed(question));
  const terms = prefixQuery(question);

  const keyword = terms
    ? `UNION ALL
       (SELECT id, row_number() OVER (ORDER BY ts_rank_cd(search, query) DESC, id) AS rank
        FROM content_chunks, to_tsquery('simple', :terms) AS query
        WHERE locale = :locale AND search @@ query
        ORDER BY rank
        LIMIT :candidates)`
    : '';

  const rows = await db.query<{ id: string; article: string; title: string; url: string; body: string }>(
    `WITH ranked AS (
       (SELECT id, row_number() OVER (ORDER BY embedding <=> CAST(:embedding AS vector), id) AS rank
        FROM content_chunks
        WHERE locale = :locale
        ORDER BY rank
        LIMIT :candidates)
       ${keyword}
     ), fused AS (
       SELECT id, sum(1.0 / (${RRF_K} + rank)) AS score
       FROM ranked
       GROUP BY id
     )
     SELECT c.id, c.article, c.title, c.url, c.body
     FROM fused f JOIN content_chunks c ON c.id = f.id
     ORDER BY f.score DESC, c.id
     LIMIT :limit`,
    { embedding, locale, candidates, limit, ...(terms ? { terms } : {}) },
  );

  const sources: Source[] = [];
  let characters = 0;
  for (const row of rows) {
    if (characters + row.body.length > maxCharacters && sources.length > 0) break;
    characters += row.body.length;
    sources.push({ n: sources.length + 1, id: row.id, article: row.article, title: row.title, url: row.url, text: row.body });
  }
  return sources;
}
