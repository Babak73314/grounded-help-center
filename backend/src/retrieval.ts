import type { Locale } from './corpus';
import { vectorLiteral, type SqlClient } from './db/sql';
import type { Embedder } from './embeddings/types';
import { salientStems } from './evidence';
import { prefixTerms } from './text';

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
 * The keyword half's weights: one row per searched stem, weighted by how few
 * passages in the language contain it — BM25's inverse document frequency,
 * ln(1 + (N − n + 0.5) / (n + 0.5)). A stem that most passages contain adds
 * little; a stem that one passage contains adds the most.
 */
const KEYWORD_WEIGHTS = `weights AS (
  SELECT to_tsquery('simple', term) AS query,
         ln(CAST(1 + (total - matching + 0.5) / (matching + 0.5) AS float8)) AS idf
  FROM (
    SELECT term,
           (SELECT count(*) FROM content_chunks WHERE locale = :locale AND search @@ to_tsquery('simple', term)) AS matching,
           (SELECT count(*) FROM content_chunks WHERE locale = :locale) AS total
    FROM unnest(string_to_array(:terms, ' ')) AS term
  ) AS counted
)`;

/** The keyword ranking: each passage's matches, stem by stem (`ts_rank_cd`), weighted by the stem's rarity. */
const KEYWORD_RANKING = `SELECT id, row_number() OVER (ORDER BY score DESC, id) AS rank
  FROM (
    SELECT c.id, sum(w.idf * ts_rank_cd(c.search, w.query)) AS score
    FROM weights w JOIN content_chunks c ON c.locale = :locale AND c.search @@ w.query
    GROUP BY c.id
  ) AS matched
  ORDER BY rank
  LIMIT :candidates`;

/**
 * The stems the keyword half searches, space-separated: the question's
 * salient stems, the same ones the evidence floor counts — words that every
 * article uses ("platform", "application") would match nearly every passage
 * and say nothing about what was asked.
 */
function keywordTerms(question: string): string {
  return prefixTerms(salientStems(question)).join(' ');
}

/** The keyword half on its own, best first — the ids `retrieve` fuses with the vector half. */
export async function keywordRanking(db: SqlClient, question: string, locale: Locale, candidates = 20): Promise<string[]> {
  const terms = keywordTerms(question);
  if (!terms) return [];
  const rows = await db.query<{ id: string }>(`WITH ${KEYWORD_WEIGHTS} ${KEYWORD_RANKING}`, { terms, locale, candidates });
  return rows.map((row) => row.id);
}

/**
 * Hybrid search inside PostgreSQL: pgvector (cosine distance on the
 * question's embedding) finds passages that mean the same thing; full-text
 * search finds passages that use the same words — a product name, an
 * acronym, a year — which embeddings are known to blur. The keyword half
 * matches word stems as prefixes, so Turkish and English endings still match
 * ("çözümde" finds "çözüm"), weights a match in a section title above one in
 * its body, and weights each stem by its rarity, so that a word few passages
 * use counts for more than one that many repeat. The two rankings are fused
 * by reciprocal rank, so neither score scale has to be calibrated against the
 * other.
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
  const terms = keywordTerms(question);
  const keyword = terms ? `UNION ALL (${KEYWORD_RANKING})` : '';

  const rows = await db.query<{ id: string; article: string; title: string; url: string; body: string }>(
    `WITH ${terms ? `${KEYWORD_WEIGHTS},` : ''} ranked AS (
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
