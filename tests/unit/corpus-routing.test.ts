import { describe, expect, it } from 'vitest';
import { articles } from '@/content/articles';
import { buildHelpCorpus } from '@/lib/corpus';
import { switchLocalePath } from '@/lib/locale-path';
import { articlePath, localePath } from '@/lib/site';

describe('the corpus', () => {
  const corpus = buildHelpCorpus();

  it('holds every section of every article, in both languages, and nothing else', () => {
    const sections = articles.reduce((sum, article) => sum + article.sections.length, 0);
    expect(corpus.chunks).toHaveLength(sections * 2);
    for (const chunk of corpus.chunks) expect(chunk.url).toBe(articlePath(chunk.locale, chunk.article, chunk.id.split(':')[2]));
  });

  it('points every capability at its row of the status table, and its own article when it has one', () => {
    const hotel = corpus.facts.capabilities.find((capability) => capability.id === 'hotel')!;
    expect(hotel.source.url).toEqual({ en: '/en/articles/delivery-status/#hotel', tr: '/tr/articles/delivery-status/#hotel' });
    expect(hotel.article?.url.tr).toBe('/tr/articles/hotel-concierge/');
  });
});

describe('paths', () => {
  it('always end with a slash, as the static export writes them', () => {
    expect(localePath('en')).toBe('/en/');
    expect(localePath('tr', '/ask')).toBe('/tr/ask/');
    expect(articlePath('en', 'commerce', 'status')).toBe('/en/articles/commerce/#status');
  });

  it('switch language and keep the page', () => {
    expect(switchLocalePath('/en/articles/commerce/', 'tr')).toBe('/tr/articles/commerce/');
    expect(switchLocalePath('/tr/ask', 'en')).toBe('/en/ask/');
    expect(switchLocalePath('/', 'tr')).toBe('/tr/');
  });
});
