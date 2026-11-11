import { createHash } from 'node:crypto';
import { z } from 'zod';

/**
 * The shape of `/help/corpus.json`, which the site writes at build time from
 * its articles (`src/lib/corpus.ts`). Checked on every ingest: a corpus that
 * does not match is refused whole, never half-loaded. A test builds the real
 * corpus from the site's content and parses it with this schema.
 */
const localized = z.object({ en: z.string().min(1), tr: z.string().min(1) }).strict();
const localizedList = z.object({ en: z.array(z.string().min(1)), tr: z.array(z.string().min(1)) }).strict();
const locale = z.enum(['en', 'tr']);
const relativeUrl = z.string().regex(/^\/(en|tr)\//, 'a path inside the site');
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const statusLabels = ['LIVE', 'DEMO', 'LOCAL', 'OFF BY DEFAULT'] as const;
export type StatusLabel = (typeof statusLabels)[number];

export const corpusSchema = z
  .object({
    version: z.literal(1),
    facts: z
      .object({
        home: z.object({ en: relativeUrl, tr: relativeUrl }).strict(),
        capabilities: z.array(
          z
            .object({
              id: slug,
              name: localized,
              aliases: localizedList,
              labels: z.array(z.enum(statusLabels)),
              state: localized,
              meaning: localized,
              /** The section of the delivery-status article that states it. */
              source: z.object({ title: localized, url: z.object({ en: relativeUrl, tr: relativeUrl }).strict() }).strict(),
              /** The capability's own article, when it has one. */
              article: z.object({ title: localized, url: z.object({ en: relativeUrl, tr: relativeUrl }).strict() }).strict().optional(),
            })
            .strict(),
        ),
        glossary: z.array(
          z
            .object({
              id: slug,
              label: z.string().min(1),
              aliases: z.array(z.string().min(1)).min(1),
              /** Whether any article mentions it; a question naming only absent terms is not covered. */
              present: z.boolean(),
            })
            .strict(),
        ),
      })
      .strict(),
    chunks: z
      .array(
        z
          .object({
            id: z.string().min(1).max(200),
            locale,
            article: slug,
            url: relativeUrl,
            title: z.string().min(1).max(300),
            text: z.string().min(1).max(8000),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((corpus, context) => {
    const ids = new Set<string>();
    for (const chunk of corpus.chunks) {
      if (ids.has(chunk.id)) context.addIssue({ code: 'custom', message: `Duplicate chunk id ${chunk.id}` });
      ids.add(chunk.id);
    }
    const terms = new Set<string>();
    for (const term of corpus.facts.glossary) {
      if (terms.has(term.id)) context.addIssue({ code: 'custom', message: `Duplicate glossary id ${term.id}` });
      terms.add(term.id);
    }
  });

export type Corpus = z.infer<typeof corpusSchema>;
export type Facts = Corpus['facts'];
export type Capability = Facts['capabilities'][number];
export type GlossaryTerm = Facts['glossary'][number];
export type Chunk = Corpus['chunks'][number];
export type Locale = Chunk['locale'];

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** What decides whether a chunk must be embedded again: its text, and the embedder that embeds it. */
export function chunkHash(chunk: Pick<Chunk, 'locale' | 'url' | 'title' | 'text'>, embedderId: string): string {
  return sha256(`${embedderId}\n${chunk.locale}\n${chunk.url}\n${chunk.title}\n${chunk.text}`);
}
