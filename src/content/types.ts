import type { Localized } from '@/i18n/config';

/** The four labels of the architecture overview, written the same way in both languages. */
export const statusLabels = ['LIVE', 'DEMO', 'LOCAL', 'OFF BY DEFAULT'] as const;
export type StatusLabel = (typeof statusLabels)[number];

export const articleGroups = ['overview', 'architecture', 'ai', 'data-security', 'applications', 'status', 'practice'] as const;
export type ArticleGroup = (typeof articleGroups)[number];

/** One section of an article: what retrieval indexes and an answer cites. */
export interface ArticleSection {
  /** The anchor on the article page, lower-case kebab case. */
  id: string;
  heading: Localized;
  paragraphs?: Localized[];
  items?: Localized[];
}

export interface Article {
  slug: string;
  group: ArticleGroup;
  title: Localized;
  summary: Localized;
  /** The capability's label, for an application or capability article. */
  status?: StatusLabel;
  /** The sections of the architecture overview the article is written from, e.g. `§6`. */
  readme: string[];
  sections: ArticleSection[];
}

/**
 * One row of the overview's delivery-status table. `state` and `meaning` are
 * the table's two columns; `labels` are the status labels in `state`, which
 * the answer check holds every sentence to.
 */
export interface Capability {
  id: string;
  name: Localized;
  /** Every way a question or an answer names it, in each language. */
  aliases: { en: string[]; tr: string[] };
  labels: StatusLabel[];
  state: Localized;
  meaning: Localized;
  /** The capability's own article. */
  article?: string;
}

/** A technology the answer check verifies. Terms no article mentions are listed too: naming one is an invention. */
export interface GlossaryTerm {
  id: string;
  label: string;
  aliases: string[];
}
