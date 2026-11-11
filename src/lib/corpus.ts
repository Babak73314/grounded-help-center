import { articles, DELIVERY_STATUS_SLUG, getArticle } from '@/content/articles';
import { glossary } from '@/content/glossary';
import { capabilities } from '@/content/status';
import type { Article, ArticleSection, StatusLabel } from '@/content/types';
import { locales, type Locale, type Localized } from '@/i18n/config';
import { articlePath, localePath } from './site';

/**
 * What the assistant knows: the published articles and nothing else. Built
 * from the same content modules as the pages, at build time, and published
 * with them as `/help/corpus.json` — so the assistant can never know
 * something a reader cannot read, and a content change reaches it the same
 * way it reaches the pages. The backend checks this shape with a schema
 * (`backend/src/corpus.ts`) before it loads anything.
 */
export const CORPUS_VERSION = 1;

export interface CorpusChunk {
  /** Stable across builds: `article:hotel-concierge:reservation-requests:en`. */
  id: string;
  locale: Locale;
  article: string;
  /** The page and anchor the passage is on. */
  url: string;
  title: string;
  text: string;
}

export interface CorpusCapability {
  id: string;
  name: Localized;
  aliases: { en: string[]; tr: string[] };
  labels: StatusLabel[];
  state: Localized;
  meaning: Localized;
  source: { title: Localized; url: Localized };
  article?: { title: Localized; url: Localized };
}

export interface CorpusFacts {
  home: Localized;
  capabilities: CorpusCapability[];
  glossary: Array<{ id: string; label: string; aliases: string[]; present: boolean }>;
}

export interface HelpCorpus {
  version: typeof CORPUS_VERSION;
  facts: CorpusFacts;
  chunks: CorpusChunk[];
}

function both<T>(make: (locale: Locale) => T): Record<Locale, T> {
  return Object.fromEntries(locales.map((locale) => [locale, make(locale)])) as Record<Locale, T>;
}

/** The text of a section as a passage: its paragraphs, then its items as a list. */
export function sectionText(section: ArticleSection, locale: Locale): string {
  return [...(section.paragraphs ?? []).map((paragraph) => paragraph[locale]), ...(section.items ?? []).map((item) => `- ${item[locale]}`)].join('\n');
}

function chunksOf(article: Article, locale: Locale): CorpusChunk[] {
  return article.sections.map((section) => ({
    id: `article:${article.slug}:${section.id}:${locale}`,
    locale,
    article: article.slug,
    url: articlePath(locale, article.slug, section.id),
    title: `${article.title[locale]} — ${section.heading[locale]}`,
    text: sectionText(section, locale),
  }));
}

/** Whether a term occurs in a text as a whole word, case and accents ignored — the backend's rule, kept simple here. */
function mentions(text: string, alias: string): boolean {
  const fold = (value: string) => value.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  const escaped = fold(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}]|\\.[\\p{L}\\p{N}])`, 'u').test(fold(text));
}

export function buildHelpCorpus(): HelpCorpus {
  const chunks = locales.flatMap((locale) => articles.flatMap((article) => chunksOf(article, locale)));
  const allText = chunks.map((chunk) => `${chunk.title}\n${chunk.text}`).join('\n');
  const deliveryStatus = getArticle(DELIVERY_STATUS_SLUG)!;

  const facts: CorpusFacts = {
    home: both((locale) => localePath(locale)),
    capabilities: capabilities.map((capability) => {
      const own = capability.article ? getArticle(capability.article) : undefined;
      return {
        id: capability.id,
        name: capability.name,
        aliases: capability.aliases,
        labels: capability.labels,
        state: capability.state,
        meaning: capability.meaning,
        source: {
          title: both((locale) => `${deliveryStatus.title[locale]} — ${capability.name[locale]}`),
          url: both((locale) => articlePath(locale, DELIVERY_STATUS_SLUG, capability.id)),
        },
        ...(own ? { article: { title: own.title, url: both((locale) => articlePath(locale, own.slug)) } } : {}),
      };
    }),
    glossary: glossary.map((term) => ({ ...term, present: term.aliases.some((alias) => mentions(allText, alias)) })),
  };
  return { version: CORPUS_VERSION, facts, chunks };
}
