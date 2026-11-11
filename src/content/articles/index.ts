import type { Article, ArticleGroup } from '../types';
import { aiArticles } from './ai';
import { applicationArticles } from './applications';
import { architectureArticles } from './architecture';
import { dataSecurityArticles } from './data-security';
import { overviewArticles } from './overview';
import { practiceArticles } from './practice';
import { statusArticles } from './status';

/** Every article, in reading order. The architecture overview (`src/content/source/`) is their only source. */
export const articles: Article[] = [
  ...overviewArticles,
  ...architectureArticles,
  ...aiArticles,
  ...dataSecurityArticles,
  ...applicationArticles,
  ...statusArticles,
  ...practiceArticles,
];

export function getArticle(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}

export function articlesIn(group: ArticleGroup): Article[] {
  return articles.filter((article) => article.group === group);
}

export { DELIVERY_STATUS_SLUG } from './status';
